import Link from "next/link";
import GetData from "../../components/data/getData"

export default async function Page({ params }: Readonly<{ params: { slug: string } }>) {
    const {slug} = params;    const options = {
        type: 'posts',
        slug: slug,
        limit: 10
    }
    
    const results = await GetData(options);
    console.log("Results: ", results);

    return (
        <main>
            <p>Posts</p>
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