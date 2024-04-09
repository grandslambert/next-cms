import { LoadConfig } from "@/config/LoadConfig"

export default async function Footer() {
    const config = await LoadConfig();

    return (
        <footer className="w-full bg-gray-400 grid grid-cols-1 md:grid-cols-3 rounded-b-lg p-1">
            <div className="text-left pl-3">Left</div>
            <div className="text-center">Center</div>
            <div className="text-right pr-3">&copy;
                {config.firstYear &&
                    <>
                        {config.firstYear + '-'}
                    </>
                }
                {(new Date().getFullYear())} { }
                {config.credit}
            </div>
        </footer>
    )
}