import Link from "next/link";
import GetData from "../components/data/getData"

export default async function Page() {
    const options = {
        type: 'posts',
        limit: 10,
        parent: 0
    }

    const results = await GetData(options);
    console.log("Results: ", results);

    return (
        <main>
            <p>Posts</p>
            {results.length == 0 &&
            <p>No Results Found</p>
            } 

            {results.map((post: any) => (
                <section key={post._id}>
                    <h3>
                        <Link href={"/posts/" + post.slug}>{post.title}</Link>
                    </h3>
                </section>

            ))}
        </main>
    )
}