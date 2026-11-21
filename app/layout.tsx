import type { Metadata } from "next";
import "./globals.css";
import Intro from "./intro";
export const metadata: Metadata = { title: "План — AI Task Manager", description: "Задачи на своих местах" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ru"><body><Intro />{children}</body></html>; }
