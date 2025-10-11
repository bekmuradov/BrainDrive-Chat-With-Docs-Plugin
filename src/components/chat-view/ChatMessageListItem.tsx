// import React from 'react';
// import remarkGfm from "remark-gfm";
// import ReactMarkdown from "react-markdown";
// import type { ChatMessage } from '../../braindrive-plugin/pluginTypes';


// interface ChatMessageItemProps {
//   message: ChatMessage;
// }

// export const ChatMessageListItem: React.FC<ChatMessageItemProps> = ({ message }) => {
//   return (
//     <div className="space-y-3">
//       {/* User Message */}
//       <div className="flex justify-end">
//         <div className="bg-blue-600 text-white px-4 py-2 rounded-lg w-[85%]">
//           {message.content}
//         </div>
//       </div>
      
//       {/* Assistant Response */}
//       <div className="flex justify-start">
//         <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg w-[85%] prose mt-1 w-full break-words prose-p:leading-relaxed">
//             <ReactMarkdown
//                 remarkPlugins={[remarkGfm]}
//                 components={{
//                     a: (props) => (
//                         <a {...props} target="_blank" rel="noopener noreferrer"/>
//                     ),
//                 }}
//             >
//                 {message.content}
//             </ReactMarkdown>
//         </div>
//       </div>
      
//       {/* Retrieved Chunks (if any) */}
//       {message.retrieved_chunks && message.retrieved_chunks.length > 0 && (
//         <div className="text-xs text-gray-500 ml-4">
//           <details>
//             <summary className="cursor-pointer hover:text-gray-700">
//               {message.retrieved_chunks.length} source chunks used
//             </summary>
//             <div className="mt-2 space-y-1">
//               {message.retrieved_chunks.map((chunk, idx) => (
//                 <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
//                   {chunk}
//                 </div>
//               ))}
//             </div>
//           </details>
//         </div>
//       )}
//     </div>
//   );
// };
