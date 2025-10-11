// import React from "react";
// import { Loader2 } from 'lucide-react';
// import type { ChatMessage } from "../../braindrive-plugin/pluginTypes";
// import { ChatMessageListItem } from "./ChatMessageListItem";

// interface ChatMessagesProps {
//     messages: ChatMessage[];
//     sending: boolean;
// }

// interface ChatMessagesState {}

// export class ChatMessagesList extends React.Component<ChatMessagesProps, ChatMessagesState> {
//   private messagesEndRef: React.RefObject<HTMLDivElement>;
//   private scrollContainerRef: React.RefObject<HTMLDivElement>;

//   constructor(props: ChatMessagesProps) {
//     super(props);
//     this.messagesEndRef = React.createRef();
//     this.scrollContainerRef = React.createRef();
//   }

//   // scrollToBottom = () => {
//   //   this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   // };

//   scrollToBottom = () => {
//     const container = this.scrollContainerRef.current;
//     if (container) {
//       container.scrollTop = container.scrollHeight;
//     }
//   };

//   componentDidMount() {
//     this.scrollToBottom();
//   }

//   componentDidUpdate(prevProps: ChatMessagesProps) {
//     // Trigger scroll when messages change or sending state changes
//     if (prevProps.messages !== this.props.messages || prevProps.sending !== this.props.sending) {
//       this.scrollToBottom();
//     }
//   }

//   render() {
//     const { messages, sending } = this.props;
    
//     return (
//       <div
//         className="flex-1 overflow-y-auto p-4 space-y-4"
//         ref={this.scrollContainerRef}
//       >
//         {messages.map((message) => (
//           <ChatMessageListItem key={message.id} message={message} />
//         ))}
//         <div ref={this.messagesEndRef} />
//         {sending && (
//           <div className="flex justify-start">
//             <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
//               <Loader2 className="h-4 w-4 animate-spin" />
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   }
// }
