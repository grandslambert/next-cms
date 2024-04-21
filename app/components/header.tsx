import NavBar from "./navbar";

export default async function Header() {
    return (
        <header className="header">
            <h1 className="py-4 text-2xl bg-white text-center site_name">Page Title</h1>
            <NavBar menu="main" />
        </header>

    )
}