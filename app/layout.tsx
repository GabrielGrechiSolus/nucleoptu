 import type { Metadata } from "next";
 import { Geist, Geist_Mono } from "next/font/google";
 import "./globals.css";
 import { ToastContainer } from 'react-toastify';
 import 'react-toastify/dist/ReactToastify.css';
 import { AuthProvider } from "./AuthContext";
 
 const geistSans = Geist({
   variable: "--font-geist-sans",
 });
 const geistMono = Geist_Mono({
   variable: "--font-geist-mono",
 });
 
 export const metadata: Metadata = {
   title: "Nucleo PTU",
   description: "Gestão de Contas Médicas e Snacks",
 };
 
 export default function RootLayout({
   children,
 }: Readonly<{
   children: React.ReactNode;
 }>) {
   return (
     <html lang="en">
       <body
         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
       >
         <AuthProvider>
           <ToastContainer theme="dark" autoClose={3000} />
           {children}
         </AuthProvider>
       </body>
     </html>
   );
 }