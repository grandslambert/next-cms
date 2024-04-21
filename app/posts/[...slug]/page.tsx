import GetData from "../../components/data/getData"

export default async function Page({ params }: Readonly<{ params: { slug: any } }>) {
    const { slug } = params;
    console.log("The slug is: ", slug, typeof slug);
    const options = {
        type: 'posts',
        slug: slug,
        limit: 10
    }

    const results = await GetData(options);
    console.log("Results: ", results);

    return (
        <main>
            {results.length == 0 &&
                <>
                    <h2>Oops!</h2>
                    <p>We did not find your data.</p>
                </>
            }
            {results.map((post: any) => (
                <section key={post._id}>
                    <h3>{post.title}</h3>
                    <section>{post.content}</section>
                </section>

            ))}
        </main>
    )
}