export default function Footer() {
    return (
        <footer>
            <div className="grid grid-cols-3 gap-2 p-2 bg-gray-200 border-t border-t-black">
                <div className="text-center lg:text-left">left</div>
                <div className="text-center">center</div>
                <div className="text-center lg:text-right">right</div>
            </div>
        </footer>
    )
}