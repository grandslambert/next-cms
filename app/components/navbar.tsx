import Link from "next/link";
import GetNav from "./data/getNav";

interface Options {
    menu: string;
}

export default async function NavBar(options: Readonly<Options>) {
    const nav = await GetNav({ menu: options.menu });
    console.log("Nav menu is: ", nav);

    return (
        <nav>
            <ul className="flex gap-4 bg-yellow-400 p-3">
                {nav?.map((item: any) => (
                    <li key={item._id} className="">
                        <Link href={"/" + item.slug} className="hover:underline">
                            {item.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    )
}