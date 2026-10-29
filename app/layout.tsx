 import type { Metadata } from "next";
 import { Poppins } from "next/font/google";
 import "./globals.css";
 import { ToastContainer } from 'react-toastify';
 import 'react-toastify/dist/ReactToastify.css';
 import { AuthProvider } from "./AuthContext";
 
 const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});
 
 export const metadata: Metadata = {
   title: "Nucleo PTU",
   description: "Gestão de Contas Médicas",
 };
 
 export default function RootLayout({
   children,
 }: Readonly<{
   children: React.ReactNode;
 }>) {
   return (
     <html lang="pt-BR" suppressHydrationWarning>
       <body
         className={`${poppins.variable} antialiased`}
       >
         <AuthProvider>
           <ToastContainer theme="light" autoClose={3000} />
           {children}
         </AuthProvider>
       </body>
     </html>
   );
 }