import GetConnection from "./getConnection";

interface Options {
    type: string;
    limit?: number;
    page?: number;
    sort?: string;
    order?: string;
    parent?: number;
    slug?: any;
}

export default async function GetData(options: Options) {
    let find = {
        parent: options.parent ?? 0,
        slug: ''
    };
    let sort = {};

    switch (options.type) {
        case "posts":
            if (options.slug) {
                find.slug = options.slug.join('/');
            }
            break;
        case "pages":
            find.slug = options.slug;
            break
        default:
            console.log(options.type);
    }

    console.log("The options are: ", find);

    try {
        const client = await GetConnection();
        const db = client.db(process.env.MONGODB_DBNAME);
        const posts = await db
            .collection(process.env.MONGODB_PREFIX + options.type)
            .find(find)
            .sort(sort)
            .limit(options.limit ?? 10)
            .toArray();

        return JSON.parse(JSON.stringify(posts));
    } catch (e) {
        console.error(e);
    }

    return options;
}