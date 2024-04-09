import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./includes/header";
import Footer from "./includes/footer";
import { LoadConfig } from "@/config/LoadConfig";
import LeftNav from "./includes/LeftNav";
import RightNav from "./includes/RightNav";

const inter = Inter({ subsets: ["latin"] });



export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await LoadConfig();

  return (
    <html lang="en">
      <body className={inter.className + ' max-w-screen-lg m-auto'}>
        <Header />
        <section className="w-full border-x border-gray-400 flex flex-row">
          {config?.leftNav && <LeftNav />}
          <div className="grow">{children}</div>
          {config?.rightNav && <RightNav />}
        </section>
        <Footer />
      </body>
    </html>
  );
}
