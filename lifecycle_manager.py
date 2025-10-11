#!/usr/bin/env python3
"""
BrainDriveChatWithDocs Plugin Lifecycle Manager (New Architecture)

This script handles install/update/delete operations for the BrainDriveChatWithDocs plugin
using the new multi-user plugin lifecycle management architecture.
"""

import json
import logging
import datetime
import os
import shutil
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import structlog

logger = structlog.get_logger()

# Import the new base lifecycle manager
try:
    # Try to import from the BrainDrive system first (when running in production)
    from app.plugins.base_lifecycle_manager import BaseLifecycleManager
    logger.info("Using new architecture: BaseLifecycleManager imported from app.plugins")
except ImportError:
    try:
        # Try local import for development
        import sys
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_path = os.path.join(current_dir, "..", "..", "backend", "app", "plugins")
        backend_path = os.path.abspath(backend_path)
        
        if os.path.exists(backend_path):
            if backend_path not in sys.path:
                sys.path.insert(0, backend_path)
            from base_lifecycle_manager import BaseLifecycleManager
            logger.info(f"Using new architecture: BaseLifecycleManager imported from local backend: {backend_path}")
        else:
            # For remote installation, the base class might not be available
            # In this case, we'll create a minimal implementation
            logger.warning(f"BaseLifecycleManager not found at {backend_path}, using minimal implementation")
            from abc import ABC, abstractmethod
            from datetime import datetime
            from pathlib import Path
            from typing import Set
            
            class BaseLifecycleManager(ABC):
                """Minimal base class for remote installations"""
                def __init__(self, plugin_slug: str, version: str, shared_storage_path: Path):
                    self.plugin_slug = plugin_slug
                    self.version = version
                    self.shared_path = shared_storage_path
                    self.active_users: Set[str] = set()
                    self.instance_id = f"{plugin_slug}_{version}"
                    self.created_at = datetime.now()
                    self.last_used = datetime.now()
                
                async def install_for_user(self, user_id: str, db, shared_plugin_path: Path):
                    if user_id in self.active_users:
                        return {'success': False, 'error': 'Plugin already installed for user'}
                    result = await self._perform_user_installation(user_id, db, shared_plugin_path)
                    if result['success']:
                        self.active_users.add(user_id)
                        self.last_used = datetime.now()
                    return result
                
                async def uninstall_for_user(self, user_id: str, db):
                    if user_id not in self.active_users:
                        return {'success': False, 'error': 'Plugin not installed for user'}
                    result = await self._perform_user_uninstallation(user_id, db)
                    if result['success']:
                        self.active_users.discard(user_id)
                        self.last_used = datetime.now()
                    return result
                
                @abstractmethod
                async def get_plugin_metadata(self): pass
                @abstractmethod
                async def get_module_metadata(self): pass
                @abstractmethod
                async def _perform_user_installation(self, user_id, db, shared_plugin_path): pass
                @abstractmethod
                async def _perform_user_uninstallation(self, user_id, db): pass
            
            logger.info("Using minimal BaseLifecycleManager implementation for remote installation")
            
    except ImportError as e:
        logger.error(f"Failed to import BaseLifecycleManager: {e}")
        raise ImportError("BrainDriveChatWithDocs plugin requires the new architecture BaseLifecycleManager")


class BrainDriveChatWithDocsLifecycleManager(BaseLifecycleManager):
    """Lifecycle manager for BrainDriveChatWithDocs plugin using new architecture"""
    
    def __init__(self, plugins_base_dir: str = None):
        """Initialize the lifecycle manager"""
        # Define plugin-specific data
        self.plugin_data = {
            "name": "BrainDriveChatWithDocs",
            "description": "Comprehensive AI chat interface with model selection and conversation history",
            "version": "1.0.3",
            "type": "frontend",
            "icon": "MessageSquare",
            "category": "ai",
            "official": False,
            "author": "BrainDrive",
            "compatibility": "1.0.0",
            "scope": "BrainDriveChatWithDocs",
            "bundle_method": "webpack",
            "bundle_location": "dist/remoteEntry.js",
            "is_local": False,
            "long_description": "A unified AI chat interface that combines AI prompt chat, model selection, and conversation history management in a single, responsive plugin with light/dark theme support.",
            "plugin_slug": "BrainDriveChatWithDocs",
            # Update tracking fields (matching plugin model)
            "source_type": "github",
            "source_url": "https://github.com/bekmuradov/BrainDrive-Chat-With-Docs-Plugin",
            "update_check_url": "https://github.com/bekmuradov/BrainDrive-Chat-With-Docs-Plugin/releases/latest",
            "last_update_check": None,
            "update_available": False,
            "latest_version": None,
            "installation_type": "remote",
            "permissions": ["storage.read", "storage.write", "api.access"]
        }

        self.settings_definition_id = 'chat_with_document_processor_settings'

        self.required_services_runtime = [
            {
                "name": "cwyd_service",
                "source_url": "https://github.com/BrainDriveAI/chat-with-your-documents",
                "type": "docker-compose",
                "install_command": "docker compose build",
                "start_command": "docker compose up -d",
                "healthcheck_url": "http://localhost:8000/health",
                "definition_id": self.settings_definition_id,
                "required_env_vars": [
                    "LLM_PROVIDER",
                    "EMBEDDING_PROVIDER",
                    "ENABLE_CONTEXTUAL_RETRIEVAL",
                    "OLLAMA_CONTEXTUAL_LLM_BASE_URL",
                    "OLLAMA_CONTEXTUAL_LLM_MODEL",
                    "OLLAMA_LLM_BASE_URL",
                    "OLLAMA_LLM_MODEL",
                    "OLLAMA_EMBEDDING_BASE_URL",
                    "OLLAMA_EMBEDDING_MODEL",
                    "DOCUMENT_PROCESSOR_API_URL",
                    "DOCUMENT_PROCESSOR_TIMEOUT",
                    "DOCUMENT_PROCESSOR_MAX_RETRIES",
                ]
            },
            {
                "name": "document_processing_service",
                "source_url": "https://github.com/BrainDriveAI/Document-Processing-Service",
                "type": "docker-compose",
                "install_command": "docker compose build",
                "start_command": "docker compose up -d",
                "healthcheck_url": "http://localhost:8080/health",
                "definition_id": self.settings_definition_id,
                "required_env_vars": [
                    # Authentication
                    "DISABLE_AUTH",
                    "AUTH_METHOD",
                    "AUTH_API_KEY",
                    "JWT_SECRET",
                    "JWT_ALGORITHM",
                    "JWT_EXPIRE_MINUTES",

                    # Document processing
                    "SPACY_MODEL",
                    "DEFAULT_CHUNKING_STRATEGY",
                    "DEFAULT_CHUNK_SIZE",
                    "DEFAULT_CHUNK_OVERLAP",
                    "MIN_CHUNK_SIZE",
                    "MAX_CHUNK_SIZE",

                    # Logging
                    "LOG_FORMAT",
                    "LOG_FILE"
                ]
            }
        ]
        
        self.module_data = [
            {
                "name": "BrainDriveChatWithDocsModule",
                "display_name": "AI Chat With Docs Interface",
                "description": "Complete AI chat with docs interface with model selection and conversation history",
                "icon": "MessageSquare",
                "category": "ai",
                "priority": 1,
                "props": {
                    "initialGreeting": "Hello! I'm your AI assistant. How can I help you today?",
                    "defaultStreamingMode": True,
                    "promptQuestion": "What would you like to know?"
                },
                "config_fields": {
                    "initial_greeting": {
                        "type": "text",
                        "description": "Initial greeting message from AI",
                        "default": "Hello! I'm your AI assistant. How can I help you today?"
                    },
                    "enable_streaming": {
                        "type": "boolean",
                        "description": "Enable streaming responses by default",
                        "default": True
                    },
                    "max_conversation_history": {
                        "type": "number",
                        "description": "Maximum number of conversations to show in history",
                        "default": 50
                    },
                    "auto_save_conversations": {
                        "type": "boolean",
                        "description": "Automatically save conversations",
                        "default": True
                    },
                    "show_model_selection": {
                        "type": "boolean",
                        "description": "Show model selection dropdown",
                        "default": True
                    },
                    "show_conversation_history": {
                        "type": "boolean",
                        "description": "Show conversation history panel",
                        "default": True
                    }
                },
                "messages": {},
                "required_services": {
                    "api": {"methods": ["get", "post", "put", "delete", "postStreaming"], "version": "1.0.0"},
                    "event": {"methods": ["sendMessage", "subscribeToMessages", "unsubscribeFromMessages"], "version": "1.0.0"},
                    "theme": {"methods": ["getCurrentTheme", "addThemeChangeListener", "removeThemeChangeListener"], "version": "1.0.0"},
                    "settings": {"methods": ["getSetting", "setSetting", "getSettingDefinitions"], "version": "1.0.0"},
                    "pageContext": {"methods": ["getCurrentPageContext", "onPageContextChange"], "version": "1.0.0"}
                },
                "dependencies": [],
                "layout": {
                    "minWidth": 6,
                    "minHeight": 6,
                    "defaultWidth": 8,
                    "defaultHeight": 8
                },
                "tags": ["ai", "chat", "conversation", "assistant", "model-selection", "history"]
            }
        ]
        
        # Initialize base class with required parameters
        logger.info(f"BrainDriveChatWithDocs: plugins_base_dir - {plugins_base_dir}")
        if plugins_base_dir:
            # When instantiated by the remote installer, plugins_base_dir points to the plugins directory
            # Shared plugins are stored under plugins_base_dir/shared/plugin_slug/version
            shared_path = Path(plugins_base_dir) / "shared" / self.plugin_data['plugin_slug'] / f"v{self.plugin_data['version']}"
        else:
            # When running from the PluginBuild directory during development,
            # resolve the path to backend/plugins/shared
            shared_path = Path(__file__).parent.parent.parent / "backend" / "plugins" / "shared" / self.plugin_data['plugin_slug'] / f"v{self.plugin_data['version']}"
        logger.info(f"BrainDriveChatWithDocs: shared_path - {shared_path}")
        super().__init__(
            plugin_slug=self.plugin_data['plugin_slug'],
            version=self.plugin_data['version'],
            shared_storage_path=shared_path
        )
    
    @property
    def PLUGIN_DATA(self):
        """Compatibility property for remote installer validation"""
        return self.plugin_data
    
    async def get_plugin_metadata(self) -> Dict[str, Any]:
        """Return plugin metadata and configuration"""
        return self.plugin_data
    
    async def get_module_metadata(self) -> list:
        """Return module definitions for this plugin"""
        return self.module_data
    
    async def _perform_user_installation(self, user_id: str, db: AsyncSession, shared_plugin_path: Path) -> Dict[str, Any]:
        """Perform user-specific installation using shared plugin path"""
        try:
            # Create database records for this user
            db_result = await self._create_database_records(user_id, db)
            if not db_result['success']:
                return db_result
            
            # Create settings definition and instance
            settings_result = await self._create_settings(user_id, db)
            if not settings_result['success']:
                return settings_result
            
            # Commit all database changes
            try:
                await db.commit()
                logger.info(f"BrainDriveChatWithDocs: Database changes committed successfully")
            except Exception as commit_error:
                logger.error(f"BrainDriveChatWithDocs: Failed to commit database changes: {commit_error}")
                await db.rollback()
                return {'success': False, 'error': f'Failed to commit database changes: {str(commit_error)}'}
            
            logger.info(f"BrainDriveChatWithDocs: User installation completed for {user_id}")
            return {
                'success': True,
                'plugin_id': db_result['plugin_id'],
                'plugin_slug': self.plugin_data['plugin_slug'],
                'plugin_name': self.plugin_data['name'],
                'modules_created': db_result['modules_created'],
                'settings_created': settings_result['settings_created']
            }
            
        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: User installation failed for {user_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _perform_user_uninstallation(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Perform user-specific uninstallation"""
        try:
            # Check if plugin exists for user
            existing_check = await self._check_existing_plugin(user_id, db)
            if not existing_check['exists']:
                return {'success': False, 'error': 'Plugin not found for user'}
            
            plugin_id = existing_check['plugin_id']
            
            # Delete database records
            delete_result = await self._delete_database_records(user_id, plugin_id, db)
            if not delete_result['success']:
                return delete_result
            
            # Remove settings instance
            settings_result = await self._remove_settings(user_id, db)

            # Commit all database changes
            try:
                await db.commit()
                logger.info(f"BrainDriveChatWithDocs: Uninstall changes committed successfully")
            except Exception as commit_error:
                logger.error(f"BrainDriveChatWithDocs: Failed to commit uninstall changes: {commit_error}")
                await db.rollback()
                return {'success': False, 'error': f'Failed to commit uninstall changes: {str(commit_error)}'}
            
            logger.info(f"BrainDriveChatWithDocs: User uninstallation completed for {user_id}")
            return {
                'success': True,
                'plugin_id': plugin_id,
                'deleted_modules': delete_result['deleted_modules'],
                'settings_removed': settings_result.get('settings_removed', 0)
            }

        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: User uninstallation failed for {user_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _copy_plugin_files_impl(self, user_id: str, target_dir: Path, update: bool = False) -> Dict[str, Any]:
        """
        BrainDriveChatWithDocs-specific implementation of file copying.
        This method is called by the base class during installation.
        Copies all files from the plugin source directory to the target directory.
        """
        try:
            source_dir = Path(__file__).parent
            copied_files = []
            
            # Define files and directories to exclude (similar to build_archive.py)
            exclude_patterns = {
                'node_modules',
                'package-lock.json',
                '.git',
                '.gitignore',
                '__pycache__',
                '*.pyc',
                '.DS_Store',
                'Thumbs.db'
            }
            
            def should_copy(path: Path) -> bool:
                """Check if a file/directory should be copied"""
                # Check if any part of the path matches exclude patterns
                for part in path.parts:
                    if part in exclude_patterns:
                        return False
                # Check for pattern matches
                for pattern in exclude_patterns:
                    if '*' in pattern and path.name.endswith(pattern.replace('*', '')):
                        return False
                return True
            
            # Copy all files and directories recursively
            for item in source_dir.rglob('*'):
                # Skip the lifecycle_manager.py file itself to avoid infinite recursion
                if item.name == 'lifecycle_manager.py' and item == Path(__file__):
                    continue
                    
                # Get relative path from source directory
                relative_path = item.relative_to(source_dir)
                
                # Check if we should copy this item
                if not should_copy(relative_path):
                    continue
                
                target_path = target_dir / relative_path
                
                try:
                    if item.is_file():
                        # Create parent directories if they don't exist
                        target_path.parent.mkdir(parents=True, exist_ok=True)
                        
                        # Copy file
                        if update and target_path.exists():
                            target_path.unlink()  # Remove existing file
                        shutil.copy2(item, target_path)
                        copied_files.append(str(relative_path))
                        logger.debug(f"Copied file: {relative_path}")
                        
                    elif item.is_dir():
                        # Create directory
                        target_path.mkdir(parents=True, exist_ok=True)
                        logger.debug(f"Created directory: {relative_path}")
                        
                except Exception as e:
                    logger.warning(f"Failed to copy {relative_path}: {e}")
                    continue
            
            # Also copy the lifecycle_manager.py file itself
            lifecycle_manager_source = source_dir / 'lifecycle_manager.py'
            lifecycle_manager_target = target_dir / 'lifecycle_manager.py'
            if lifecycle_manager_source.exists():
                lifecycle_manager_target.parent.mkdir(parents=True, exist_ok=True)
                if update and lifecycle_manager_target.exists():
                    lifecycle_manager_target.unlink()
                shutil.copy2(lifecycle_manager_source, lifecycle_manager_target)
                copied_files.append('lifecycle_manager.py')
                logger.info(f"Copied lifecycle_manager.py")
            
            logger.info(f"BrainDriveChatWithDocs: Copied {len(copied_files)} files/directories to {target_dir}")
            return {'success': True, 'copied_files': copied_files}
            
        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: Error copying plugin files: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _validate_installation_impl(self, user_id: str, plugin_dir: Path) -> Dict[str, Any]:
        """
        BrainDriveChatWithDocs-specific validation logic.
        This method is called by the base class during installation.
        """
        try:
            # Check for BrainDriveChatWithDocs-specific required files
            required_files = ["package.json", "dist/remoteEntry.js"]
            missing_files = []
            
            for file_path in required_files:
                if not (plugin_dir / file_path).exists():
                    missing_files.append(file_path)
            
            if missing_files:
                return {
                    'valid': False,
                    'error': f"BrainDriveChatWithDocs: Missing required files: {', '.join(missing_files)}"
                }
            
            # Validate package.json structure
            package_json_path = plugin_dir / "package.json"
            try:
                with open(package_json_path, 'r') as f:
                    package_data = json.load(f)
                
                # Check for required package.json fields
                required_fields = ["name", "version"]
                for field in required_fields:
                    if field not in package_data:
                        return {
                            'valid': False,
                            'error': f'BrainDriveChatWithDocs: package.json missing required field: {field}'
                        }
                        
            except (json.JSONDecodeError, FileNotFoundError) as e:
                return {
                    'valid': False,
                    'error': f'BrainDriveChatWithDocs: Invalid or missing package.json: {e}'
                }
            
            # Validate bundle file exists and is not empty
            bundle_path = plugin_dir / "dist" / "remoteEntry.js"
            if bundle_path.stat().st_size == 0:
                return {
                    'valid': False,
                    'error': 'BrainDriveChatWithDocs: Bundle file (remoteEntry.js) is empty'
                }
            
            logger.info(f"BrainDriveChatWithDocs: Installation validation passed for user {user_id}")
            return {'valid': True}
            
        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: Error validating installation: {e}")
            return {'valid': False, 'error': str(e)}
    
    async def _get_plugin_health_impl(self, user_id: str, plugin_dir: Path) -> Dict[str, Any]:
        """
        BrainDriveChatWithDocs-specific health check logic.
        This method is called by the base class during status checks.
        """
        try:
            health_info = {
                'bundle_exists': False,
                'bundle_size': 0,
                'package_json_valid': False,
                'assets_present': False
            }
            
            # Check bundle file
            bundle_path = plugin_dir / "dist" / "remoteEntry.js"
            if bundle_path.exists():
                health_info['bundle_exists'] = True
                health_info['bundle_size'] = bundle_path.stat().st_size
            
            # Check package.json
            package_json_path = plugin_dir / "package.json"
            if package_json_path.exists():
                try:
                    with open(package_json_path, 'r') as f:
                        json.load(f)
                    health_info['package_json_valid'] = True
                except json.JSONDecodeError:
                    pass
            
            # Check for assets directory
            assets_path = plugin_dir / "assets"
            if assets_path.exists() and assets_path.is_dir():
                health_info['assets_present'] = True
            
            # Determine overall health
            is_healthy = (
                health_info['bundle_exists'] and 
                health_info['bundle_size'] > 0 and
                health_info['package_json_valid']
            )
            
            return {
                'healthy': is_healthy,
                'details': health_info
            }
            
        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: Error checking plugin health: {e}")
            return {
                'healthy': False,
                'details': {'error': str(e)}
            }
    
    async def _check_existing_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Check if plugin already exists for user"""
        try:
            plugin_slug = self.plugin_data['plugin_slug']
            logger.info(f"BrainDriveChatWithDocs: Checking for existing plugin - user_id: {user_id}, plugin_slug: {plugin_slug}")
            
            # First test database connectivity
            test_query = text("SELECT COUNT(*) as count FROM plugin")
            test_result = await db.execute(test_query)
            test_row = test_result.fetchone()
            logger.info(f"BrainDriveChatWithDocs: Database connectivity test - total plugins: {test_row.count}")
            
            plugin_query = text("""
            SELECT id, name, version, enabled, created_at, updated_at, plugin_slug
            FROM plugin
            WHERE user_id = :user_id AND plugin_slug = :plugin_slug
            """)
            
            query_params = {
                'user_id': user_id,
                'plugin_slug': plugin_slug
            }
            logger.info(f"BrainDriveChatWithDocs: Executing query with params: {query_params}")
            
            result = await db.execute(plugin_query, query_params)
            
            plugin_row = result.fetchone()
            logger.info(f"BrainDriveChatWithDocs: Query result: {plugin_row}")
            if plugin_row:
                logger.info(f"BrainDriveChatWithDocs: Found existing plugin - id: {plugin_row.id}, name: {plugin_row.name}")
                return {
                    'exists': True,
                    'plugin_id': plugin_row.id,
                    'plugin_info': {
                        'id': plugin_row.id,
                        'name': plugin_row.name,
                        'version': plugin_row.version,
                        'enabled': plugin_row.enabled,
                        'created_at': plugin_row.created_at,
                        'updated_at': plugin_row.updated_at
                    }
                }
            else:
                logger.warning(f"BrainDriveChatWithDocs: No plugin found for user_id: {user_id}, plugin_slug: {plugin_slug}")
                
                # Debug: Check if there are any plugins for this user
                debug_query = text("SELECT id, plugin_slug FROM plugin WHERE user_id = :user_id")
                debug_result = await db.execute(debug_query, {'user_id': user_id})
                debug_rows = debug_result.fetchall()
                if debug_rows:
                    logger.info(f"BrainDriveChatWithDocs: User has {len(debug_rows)} other plugins:")
                    for row in debug_rows:
                        logger.info(f"  - {row.plugin_slug} (id: {row.id})")
                else:
                    logger.info(f"BrainDriveChatWithDocs: User has no plugins installed")
                
                return {'exists': False}
                
        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: Error checking existing plugin: {e}")
            return {'exists': False, 'error': str(e)}
    
    async def _check_and_create_service_runtime_table(self, db: AsyncSession) -> bool:
        """Check if plugin_service_runtime table exists and create it if not"""
        try:
            # Try to check if the table exists
            check_table_query = text("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='plugin_service_runtime'
            """)
            result = await db.execute(check_table_query)
            table_exists = result.fetchone() is not None
            
            if not table_exists:
                logger.info("plugin_service_runtime table does not exist, creating it...")
                create_table_query = text("""
                CREATE TABLE plugin_service_runtime (
                    id VARCHAR PRIMARY KEY,
                    plugin_id VARCHAR NOT NULL,
                    plugin_slug VARCHAR NOT NULL,
                    name VARCHAR NOT NULL,
                    source_url VARCHAR,
                    type VARCHAR,
                    install_command TEXT,
                    start_command TEXT,
                    healthcheck_url VARCHAR,
                    required_env_vars TEXT,
                    status VARCHAR DEFAULT 'pending',
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP,
                    user_id VARCHAR NOT NULL,
                    FOREIGN KEY (plugin_id) REFERENCES plugin (id) ON DELETE CASCADE
                )
                """)
                await db.execute(create_table_query)
                await db.commit()
                logger.info("plugin_service_runtime table created successfully")
                return True
            else:
                logger.info("plugin_service_runtime table already exists")
                return True
                
        except Exception as e:
            logger.warning(f"Failed to create plugin_service_runtime table: {e}")
            return False

    async def _create_database_records(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Create plugin and module records in database"""
        try:
            current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            plugin_slug = self.plugin_data['plugin_slug']
            plugin_id = f"{user_id}_{plugin_slug}"
            
            logger.info(f"BrainDriveChatWithDocs: Creating database records - user_id: {user_id}, plugin_slug: {plugin_slug}, plugin_id: {plugin_id}")
            
            plugin_stmt = text("""
            INSERT INTO plugin
            (id, name, description, version, type, enabled, icon, category, status,
            official, author, last_updated, compatibility, downloads, scope,
            bundle_method, bundle_location, is_local, long_description,
            config_fields, messages, dependencies, created_at, updated_at, user_id,
            plugin_slug, source_type, source_url, update_check_url, last_update_check,
            update_available, latest_version, installation_type, permissions)
            VALUES
            (:id, :name, :description, :version, :type, :enabled, :icon, :category,
            :status, :official, :author, :last_updated, :compatibility, :downloads,
            :scope, :bundle_method, :bundle_location, :is_local, :long_description,
            :config_fields, :messages, :dependencies, :created_at, :updated_at, :user_id,
            :plugin_slug, :source_type, :source_url, :update_check_url, :last_update_check,
            :update_available, :latest_version, :installation_type, :permissions)
            """)
            
            await db.execute(plugin_stmt, {
                'id': plugin_id,
                'name': self.plugin_data['name'],
                'description': self.plugin_data['description'],
                'version': self.plugin_data['version'],
                'type': self.plugin_data['type'],
                'enabled': True,
                'icon': self.plugin_data['icon'],
                'category': self.plugin_data['category'],
                'status': 'activated',
                'official': self.plugin_data['official'],
                'author': self.plugin_data['author'],
                'last_updated': current_time,
                'compatibility': self.plugin_data['compatibility'],
                'downloads': 0,
                'scope': self.plugin_data['scope'],
                'bundle_method': self.plugin_data['bundle_method'],
                'bundle_location': self.plugin_data['bundle_location'],
                'is_local': self.plugin_data['is_local'],
                'long_description': self.plugin_data['long_description'],
                'config_fields': json.dumps({}),
                'messages': None,
                'dependencies': None,
                'created_at': current_time,
                'updated_at': current_time,
                'user_id': user_id,
                'plugin_slug': plugin_slug,
                'source_type': self.plugin_data['source_type'],
                'source_url': self.plugin_data['source_url'],
                'update_check_url': self.plugin_data['update_check_url'],
                'last_update_check': self.plugin_data['last_update_check'],
                'update_available': self.plugin_data['update_available'],
                'latest_version': self.plugin_data['latest_version'],
                'installation_type': self.plugin_data['installation_type'],
                'permissions': json.dumps(self.plugin_data['permissions'])
            })
            
            modules_created = []
            for module_data in self.module_data:
                module_id = f"{user_id}_{plugin_slug}_{module_data['name']}"
                
                module_stmt = text("""
                INSERT INTO module
                (id, plugin_id, name, display_name, description, icon, category,
                enabled, priority, props, config_fields, messages, required_services,
                dependencies, layout, tags, created_at, updated_at, user_id)
                VALUES
                (:id, :plugin_id, :name, :display_name, :description, :icon, :category,
                :enabled, :priority, :props, :config_fields, :messages, :required_services,
                :dependencies, :layout, :tags, :created_at, :updated_at, :user_id)
                """)
                
                await db.execute(module_stmt, {
                    'id': module_id,
                    'plugin_id': plugin_id,
                    'name': module_data['name'],
                    'display_name': module_data['display_name'],
                    'description': module_data['description'],
                    'icon': module_data['icon'],
                    'category': module_data['category'],
                    'enabled': True,
                    'priority': module_data['priority'],
                    'props': json.dumps(module_data['props']),
                    'config_fields': json.dumps(module_data['config_fields']),
                    'messages': json.dumps(module_data['messages']),
                    'required_services': json.dumps(module_data['required_services']),
                    'dependencies': json.dumps(module_data['dependencies']),
                    'layout': json.dumps(module_data['layout']),
                    'tags': json.dumps(module_data['tags']),
                    'created_at': current_time,
                    'updated_at': current_time,
                    'user_id': user_id
                })
                
                modules_created.append(module_id)

            # Try to create service runtime records if table exists or can be created
            services_created = []
            service_table_available = await self._check_and_create_service_runtime_table(db)
            
            if service_table_available and self.required_services_runtime:
                try:
                    for service_data in self.required_services_runtime:
                        service_id = f"{user_id}_{plugin_slug}_{service_data['name']}"
                        
                        service_stmt = text("""
                        INSERT INTO plugin_service_runtime
                        (id, plugin_id, plugin_slug, name, source_url, type, install_command, start_command,
                        healthcheck_url, definition_id, required_env_vars, status, created_at, updated_at, user_id)
                        VALUES
                        (:id, :plugin_id, :plugin_slug, :name, :source_url, :type, :install_command, :start_command,
                        :healthcheck_url, :definition_id, :required_env_vars, :status, :created_at, :updated_at, :user_id)
                        """)
                        
                        await db.execute(service_stmt, {
                            'id': service_id,
                            'plugin_id': plugin_id,
                            'plugin_slug': plugin_slug,
                            'name': service_data['name'],
                            'source_url': service_data['source_url'],
                            'type': service_data['type'],
                            'install_command': service_data['install_command'],
                            'start_command': service_data['start_command'],
                            'healthcheck_url': service_data['healthcheck_url'],
                            'definition_id': service_data['definition_id'],
                            'required_env_vars': json.dumps(service_data['required_env_vars']),
                            'status': 'pending',  # Default status for new services
                            'created_at': current_time,
                            'updated_at': current_time,
                            'user_id': user_id
                        })
                        
                        services_created.append(service_id)
                    
                    logger.info(f"Created {len(services_created)} service runtime records")
                
                except Exception as service_error:
                    logger.warning(f"Failed to create service runtime records: {service_error}")
                    # Don't fail the entire operation if service table creation fails
                    services_created = []
            
            # Commit the transaction
            await db.commit()
            logger.info(f"BrainDriveChatWithDocs: Database transaction committed successfully")
            
            # Verify the plugin was actually created
            verify_query = text("SELECT id, plugin_slug FROM plugin WHERE id = :plugin_id AND user_id = :user_id")
            verify_result = await db.execute(verify_query, {'plugin_id': plugin_id, 'user_id': user_id})
            verify_row = verify_result.fetchone()
            
            if verify_row:
                logger.info(f"BrainDriveChatWithDocs: Successfully created and verified database records for plugin {plugin_id} with {len(modules_created)} modules")
            else:
                logger.error(f"BrainDriveChatWithDocs: Plugin creation appeared to succeed but verification failed for plugin_id: {plugin_id}")
                return {'success': False, 'error': 'Plugin creation verification failed'}
            
            return {
                'success': True, 
                'plugin_id': plugin_id, 
                'modules_created': modules_created,
                'services_created': services_created
            }
            
        except Exception as e:
            logger.error(f"Error creating database records: {e}")
            await db.rollback()
            return {'success': False, 'error': str(e)}
    
    async def _delete_database_records(self, user_id: str, plugin_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Delete plugin and module records from database"""
        try:
            deleted_services = 0
            # Try to delete service runtime records first if table exists
            try:
                service_delete_stmt = text("""
                DELETE FROM plugin_service_runtime 
                WHERE plugin_id = :plugin_id AND user_id = :user_id
                """)
                
                service_result = await db.execute(service_delete_stmt, {
                    'plugin_id': plugin_id,
                    'user_id': user_id
                })
                
                deleted_services = service_result.rowcount
                logger.info(f"Deleted {deleted_services} service runtime records")
                
            except Exception as service_error:
                logger.warning(f"Failed to delete service runtime records (table may not exist): {service_error}")
                # Continue with plugin deletion even if service deletion fails
                deleted_services = 0
            # Delete modules first (foreign key constraint)
            module_delete_stmt = text("""
            DELETE FROM module 
            WHERE plugin_id = :plugin_id AND user_id = :user_id
            """)
            
            module_result = await db.execute(module_delete_stmt, {
                'plugin_id': plugin_id,
                'user_id': user_id
            })
            
            deleted_modules = module_result.rowcount
            
            # Delete plugin
            plugin_delete_stmt = text("""
            DELETE FROM plugin 
            WHERE id = :plugin_id AND user_id = :user_id
            """)
            
            plugin_result = await db.execute(plugin_delete_stmt, {
                'plugin_id': plugin_id,
                'user_id': user_id
            })
            
            if plugin_result.rowcount == 0:
                await db.rollback()
                return {'success': False, 'error': 'Plugin not found or not owned by user'}
            
            # Commit the transaction
            await db.commit()
            
            logger.info(f"Deleted database records for plugin {plugin_id} ({deleted_modules} modules)")
            return {
                'success': True, 
                'deleted_modules': deleted_modules,
                'deleted_services': deleted_services
            }
            
        except Exception as e:
            logger.error(f"Error deleting database records: {e}")
            await db.rollback()
            return {'success': False, 'error': str(e)}
    
    async def _create_settings(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """
        Create settings definition and instance based on Docker Compose environment variables.
        """
        try:
            logger.info(f"Starting settings creation for user {user_id}")
            
            # Use a unique ID for the new settings definition
            definition_id = self.settings_definition_id

            # Check if settings definition exists
            definition = await db.execute(
                text("SELECT id FROM settings_definitions WHERE id = :definition_id"),
                {"definition_id": definition_id}
            )
            definition = definition.scalar_one_or_none()
            
            # Construct the default value dictionary from the assumed class attributes.
            # Convert string environment variables to their appropriate types.
            default_settings_value = {
                "LLM_PROVIDER": 'ollama',
                "EMBEDDING_PROVIDER": 'ollama',
                "ENABLE_CONTEXTUAL_RETRIEVAL": True,
                "OLLAMA_CONTEXTUAL_LLM_BASE_URL": 'http://localhost:11434',
                "OLLAMA_CONTEXTUAL_LLM_MODEL": 'llama3.2:3b',
                "OLLAMA_LLM_BASE_URL": 'http://localhost:11434',
                "OLLAMA_LLM_MODEL": 'qwen3:8b',
                "OLLAMA_EMBEDDING_BASE_URL": 'http://localhost:11434',
                "OLLAMA_EMBEDDING_MODEL": 'mxbai-embed-large',
                "DOCUMENT_PROCESSOR_API_URL": 'http://localhost:8080/documents/',
                "DOCUMENT_PROCESSOR_API_KEY": 'default_api_key',
                "DOCUMENT_PROCESSOR_TIMEOUT": 600,
                "DOCUMENT_PROCESSOR_MAX_RETRIES": 3,
                # Document Processing Service
                "DISABLE_AUTH": True,
                "AUTH_METHOD": 'api_key',
                "AUTH_API_KEY": '',
                "JWT_SECRET": '',
                "JWT_ALGORITHM": 'HS256',
                "JWT_EXPIRE_MINUTES": 60,
                "SPACY_MODEL": 'en_core_web_sm',
                "DEFAULT_CHUNKING_STRATEGY": 'hierarchical',
                "DEFAULT_CHUNK_SIZE": 1000,
                "DEFAULT_CHUNK_OVERLAP": 200,
                "MIN_CHUNK_SIZE": 100,
                "MAX_CHUNK_SIZE": 2000,
                "LOG_FORMAT": 'console',
                "LOG_FILE": '/app/logs/app.log'
            }

            # Create settings definition if it doesn't exist
            if not definition:
                logger.info("Settings definition not found, creating new one")
                definition_data = {
                    'id': definition_id,
                    'name': 'Chat with Document Processor Settings',
                    'description': 'Configure the Chat with Document Processor services.',
                    'category': 'LLM and Embeddings',
                    'type': 'object',
                    'default_value': json.dumps(default_settings_value),
                    'allowed_scopes': json.dumps(['user']),
                    'validation': json.dumps({}),
                    'is_multiple': False,
                    'tags': json.dumps(['ollama', 'document-processor', 'settings']),
                    'created_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    'updated_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                definition_stmt = text("""
                INSERT INTO settings_definitions
                (id, name, description, category, type, default_value, allowed_scopes, validation, is_multiple, tags, created_at, updated_at)
                VALUES
                (:id, :name, :description, :category, :type, :default_value, :allowed_scopes, :validation, :is_multiple, :tags, :created_at, :updated_at)
                """)
                
                try:
                    await db.execute(definition_stmt, definition_data)
                    logger.info("Successfully created settings definition")
                except Exception as def_error:
                    logger.error(f"Failed to create settings definition: {def_error}")
            else:
                logger.info("Settings definition already exists")

            # Create settings instance for user
            existing_instance = await db.execute(
                text("SELECT id FROM settings_instances WHERE definition_id = :definition_id AND user_id = :user_id"),
                {"definition_id": definition_id, "user_id": user_id}
            )
            existing_instance = existing_instance.scalar_one_or_none()
            
            if not existing_instance:
                instance_data = {
                    'id': f"chat_with_doc_proc_settings_{user_id}",
                    'name': 'LLM and Document Processor Settings',
                    'definition_id': definition_id,
                    'scope': 'user',
                    'user_id': user_id,
                    'value': json.dumps(default_settings_value), # Use the same default values for the initial instance
                    'created_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    'updated_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                instance_stmt = text("""
                INSERT INTO settings_instances
                (id, name, definition_id, scope, user_id, value, created_at, updated_at)
                VALUES
                (:id, :name, :definition_id, :scope, :user_id, :value, :created_at, :updated_at)
                """)
                
                try:
                    await db.execute(instance_stmt, instance_data)
                    logger.info(f"Successfully created settings instance for user {user_id}")
                except Exception as inst_error:
                    logger.error(f"Failed to create settings instance: {inst_error}")
                    return {'success': False, 'error': f'Failed to create settings instance: {str(inst_error)}'}
            else:
                logger.info(f"Settings instance already exists for user {user_id}")

            logger.info(f"Settings creation completed successfully for user {user_id}")
            return {
                'success': True,
                'settings_created': [definition_id, f"chat_with_doc_proc_settings_{user_id}"]
            }

        except Exception as e:
            logger.error(f"Failed to create settings: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {'success': False, 'error': str(e)}

    async def _remove_settings(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Remove settings instance for user"""
        try:
            # Use the same unique ID for the settings definition
            definition_id = 'chat_with_document_processor_settings'

            # Remove settings instance
            settings_instance = await db.execute(
                text("SELECT id FROM settings_instances WHERE definition_id = :definition_id AND user_id = :user_id"),
                {"definition_id": definition_id, "user_id": user_id}
            )
            settings_instance = settings_instance.scalar_one_or_none()
            
            if settings_instance:
                delete_stmt = text("""
                DELETE FROM settings_instances 
                WHERE definition_id = :definition_id AND user_id = :user_id
                """)
                
                await db.execute(delete_stmt, {
                    'definition_id': definition_id,
                    'user_id': user_id
                })
                
                return {'success': True, 'settings_removed': 1}
            
            return {'success': True, 'settings_removed': 0}

        except Exception as e:
            logger.error(f"Failed to remove settings: {e}")
            return {'success': False, 'error': str(e)}

    async def _export_user_data(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Export user-specific data for migration during updates"""
        try:
            # Get plugin configuration
            plugin_query = text("""
            SELECT config_fields, enabled, status
            FROM plugin 
            WHERE user_id = :user_id AND plugin_slug = :plugin_slug
            """)
            
            plugin_result = await db.execute(plugin_query, {
                'user_id': user_id,
                'plugin_slug': self.plugin_data['plugin_slug']
            })
            
            plugin_row = plugin_result.fetchone()
            if not plugin_row:
                return {'success': False, 'error': 'Plugin not found for user'}
            
            # Get module configurations
            module_query = text("""
            SELECT name, config_fields, enabled, priority
            FROM module 
            WHERE plugin_id LIKE :plugin_pattern AND user_id = :user_id
            """)
            
            module_result = await db.execute(module_query, {
                'plugin_pattern': f"{user_id}_{self.plugin_data['plugin_slug']}_%",
                'user_id': user_id
            })
            
            modules_data = {}
            for module_row in module_result.fetchall():
                try:
                    config_fields = json.loads(module_row.config_fields) if module_row.config_fields else {}
                except json.JSONDecodeError:
                    config_fields = {}
                
                modules_data[module_row.name] = {
                    'config_fields': config_fields,
                    'enabled': module_row.enabled,
                    'priority': module_row.priority
                }
            
            user_data = {
                'plugin_config': {
                    'config_fields': json.loads(plugin_row.config_fields) if plugin_row.config_fields else {},
                    'enabled': plugin_row.enabled,
                    'status': plugin_row.status
                },
                'modules_config': modules_data,
                'export_timestamp': datetime.datetime.now().isoformat()
            }
            
            logger.info(f"BrainDriveChatWithDocs: Exported user data for {user_id}")
            return {'success': True, 'user_data': user_data}
            
        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: Error exporting user data: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _import_user_data(self, user_id: str, db: AsyncSession, user_data: Dict[str, Any]):
        """Import user-specific data after migration during updates"""
        try:
            if not user_data:
                logger.info(f"BrainDriveChatWithDocs: No user data to import for {user_id}")
                return
            
            plugin_config = user_data.get('plugin_config', {})
            modules_config = user_data.get('modules_config', {})
            
            # Update plugin configuration
            if plugin_config:
                plugin_update_stmt = text("""
                UPDATE plugin 
                SET config_fields = :config_fields, enabled = :enabled, status = :status
                WHERE user_id = :user_id AND plugin_slug = :plugin_slug
                """)
                
                await db.execute(plugin_update_stmt, {
                    'config_fields': json.dumps(plugin_config.get('config_fields', {})),
                    'enabled': plugin_config.get('enabled', True),
                    'status': plugin_config.get('status', 'activated'),
                    'user_id': user_id,
                    'plugin_slug': self.plugin_data['plugin_slug']
                })
            
            # Update module configurations
            for module_name, module_config in modules_config.items():
                module_update_stmt = text("""
                UPDATE module 
                SET config_fields = :config_fields, enabled = :enabled, priority = :priority
                WHERE name = :module_name AND plugin_id LIKE :plugin_pattern AND user_id = :user_id
                """)
                
                await db.execute(module_update_stmt, {
                    'config_fields': json.dumps(module_config.get('config_fields', {})),
                    'enabled': module_config.get('enabled', True),
                    'priority': module_config.get('priority', 1),
                    'module_name': module_name,
                    'plugin_pattern': f"{user_id}_{self.plugin_data['plugin_slug']}_%",
                    'user_id': user_id
                })
            
            logger.info(f"BrainDriveChatWithDocs: Imported user data for {user_id}")
            
        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: Error importing user data: {e}")
            raise
    
    def get_plugin_info(self) -> Dict[str, Any]:
        """Get plugin information (compatibility method)"""
        return self.plugin_data
    
    @property
    def MODULE_DATA(self):
        """Compatibility property for accessing module data"""
        return self.module_data
    
    # Compatibility methods for old interface
    async def install_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Install BrainDriveChatWithDocs plugin for specific user (compatibility method)"""
        try:
            logger.info(f"BrainDriveChatWithDocs: Starting installation for user {user_id}")
            
            # Check if plugin is already installed for this user
            existing_check = await self._check_existing_plugin(user_id, db)
            if existing_check['exists']:
                logger.warning(f"BrainDriveChatWithDocs: Plugin already installed for user {user_id}")
                return {
                    'success': False,
                    'error': 'Plugin already installed for user',
                    'plugin_id': existing_check['plugin_id']
                }
            
            shared_path = self.shared_path
            shared_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"BrainDriveChatWithDocs: Created shared directory: {shared_path}")

            # Copy plugin files to the shared directory first
            copy_result = await self._copy_plugin_files_impl(user_id, shared_path)
            if not copy_result['success']:
                logger.error(f"BrainDriveChatWithDocs: File copying failed: {copy_result.get('error')}")
                return copy_result

            logger.info(f"BrainDriveChatWithDocs: Files copied successfully, proceeding with database installation")
            
            # Ensure we're in a transaction
            try:
                result = await self.install_for_user(user_id, db, shared_path)
                
                if result.get('success'):
                    # Verify the installation was successful
                    verify_check = await self._check_existing_plugin(user_id, db)
                    if not verify_check['exists']:
                        logger.error(f"BrainDriveChatWithDocs: Installation appeared successful but verification failed")
                        return {'success': False, 'error': 'Installation verification failed'}
                    
                    logger.info(f"BrainDriveChatWithDocs: Installation verified successfully for user {user_id}")
                    result.update({
                        'plugin_slug': self.plugin_data['plugin_slug'],
                        'plugin_name': self.plugin_data['name']
                    })
                else:
                    logger.error(f"BrainDriveChatWithDocs: Database installation failed: {result.get('error')}")
                
                return result
                
            except Exception as db_error:
                logger.error(f"BrainDriveChatWithDocs: Database operation failed: {db_error}")
                # Try to rollback if possible
                try:
                    await db.rollback()
                except:
                    pass
                return {'success': False, 'error': f'Database operation failed: {str(db_error)}'}
                
        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: Install plugin failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def delete_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Delete BrainDriveChatWithDocs plugin for user (compatibility method)"""
        try:
            logger.info(f"BrainDriveChatWithDocs: Starting deletion for user {user_id}")
            
            # Let the base class handle the deletion - it will call _perform_user_uninstallation
            # which includes the database check
            result = await self.uninstall_for_user(user_id, db)
            
            if result.get('success'):
                logger.info(f"BrainDriveChatWithDocs: Successfully deleted plugin for user {user_id}")
            else:
                logger.error(f"BrainDriveChatWithDocs: Deletion failed: {result.get('error')}")
            
            return result
        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: Delete plugin failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_plugin_status(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Get current status of BrainDriveChatWithDocs plugin installation (compatibility method)"""
        try:
            existing_check = await self._check_existing_plugin(user_id, db)
            if not existing_check['exists']:
                return {'exists': False, 'status': 'not_installed'}
            
            # Check if shared plugin files exist
            plugin_health = await self._get_plugin_health_impl(user_id, self.shared_path)
            
            return {
                'exists': True,
                'status': 'healthy' if plugin_health['healthy'] else 'unhealthy',
                'plugin_id': existing_check['plugin_id'],
                'plugin_info': existing_check['plugin_info'],
                'health_details': plugin_health['details']
            }
            
        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: Error checking plugin status: {e}")
            return {'exists': False, 'status': 'error', 'error': str(e)}
    
    async def update_plugin(self, user_id: str, db: AsyncSession, new_version_manager: 'BrainDriveChatWithDocsLifecycleManager') -> Dict[str, Any]:
        """Update BrainDriveChatWithDocs plugin for user (compatibility method)"""
        try:
            # Export current user data
            export_result = await self._export_user_data(user_id, db)
            if not export_result['success']:
                return export_result
            
            # Uninstall current version
            uninstall_result = await self.uninstall_for_user(user_id, db)
            if not uninstall_result['success']:
                return uninstall_result
            
            # Install new version
            install_result = await new_version_manager.install_for_user(user_id, db, new_version_manager.shared_path)
            if not install_result['success']:
                return install_result
            
            # Import user data to new version
            await new_version_manager._import_user_data(user_id, db, export_result.get('user_data', {}))
            
            logger.info(f"BrainDriveChatWithDocs: Plugin updated successfully for user {user_id}")
            return {
                'success': True,
                'old_version': self.version,
                'new_version': new_version_manager.version,
                'plugin_id': install_result['plugin_id']
            }
            
        except Exception as e:
            logger.error(f"BrainDriveChatWithDocs: Plugin update failed for user {user_id}: {e}")
            return {'success': False, 'error': str(e)}


# Standalone functions for compatibility with remote installer
async def install_plugin(user_id: str, db: AsyncSession, plugins_base_dir: str = None) -> Dict[str, Any]:
    manager = BrainDriveChatWithDocsLifecycleManager(plugins_base_dir)
    return await manager.install_plugin(user_id, db)

async def delete_plugin(user_id: str, db: AsyncSession, plugins_base_dir: str = None) -> Dict[str, Any]:
    manager = BrainDriveChatWithDocsLifecycleManager(plugins_base_dir)
    return await manager.delete_plugin(user_id, db)

async def get_plugin_status(user_id: str, db: AsyncSession, plugins_base_dir: str = None) -> Dict[str, Any]:
    manager = BrainDriveChatWithDocsLifecycleManager(plugins_base_dir)
    return await manager.get_plugin_status(user_id, db)

async def update_plugin(user_id: str, db: AsyncSession, new_version_manager: 'BrainDriveChatWithDocsLifecycleManager', plugins_base_dir: str = None) -> Dict[str, Any]:
    old_manager = BrainDriveChatWithDocsLifecycleManager(plugins_base_dir)
    return await old_manager.update_plugin(user_id, db, new_version_manager)


# Test script for development
if __name__ == "__main__":
    import sys
    import asyncio
    
    async def main():
        print("BrainDriveChatWithDocs Plugin Lifecycle Manager - Test Mode")
        print("=" * 50)
        
        # Test manager initialization
        manager = BrainDriveChatWithDocsLifecycleManager()
        print(f"Plugin: {manager.plugin_data['name']}")
        print(f"Version: {manager.plugin_data['version']}")
        print(f"Slug: {manager.plugin_data['plugin_slug']}")
        print(f"Modules: {len(manager.module_data)}")
        
        for module in manager.module_data:
            print(f"  - {module['display_name']} ({module['name']})")
    
    asyncio.run(main())
