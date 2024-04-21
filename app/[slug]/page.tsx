import GetData from "../components/data/getData";

export default async function Page({ params }: Readonly<{ params: { slug: any } }>) {
    const { slug } = params;
    console.log("The slug is: ", slug, typeof slug);
    const options = {
        type: 'pages',
        slug: slug,
        limit: 1
    }

    const results = await GetData(options);
    console.log(results);

    return (
        <main>
            {results?.map((result: any) => (
                <section key={result._id}>
                    <h2>{result.title}</h2>
                    <p>{result.content}</p>
                </section>
            ))}
        </main>
    )
}