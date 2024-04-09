import { LoadConfig } from "@/config/LoadConfig";
import Link from "next/link";

export default async function Header() {
    const config = await LoadConfig();

    return (
        <header className=" bg-yellow-300 rounded-t-lg mt-2 border border-gray-400">
            <h1 className="">{config.title}</h1>
            <nav>
                <ul className="bg-blue-300 grid grid-flow-col auto-cols-auto gap-1 p-1">
                    {config.nav.map((item:any) => (
                        <li key={item.id} className="text-center hover:underline hover:font-bold hover:text-red-600">
                            <Link href={item.url}>{item.text}</Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </header>
    )
}