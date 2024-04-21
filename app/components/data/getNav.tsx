import GetConnection from "./getConnection";

interface Options {
    menu: string;
}

export default async function GetNav(options: Options) {
    console.log("Nav Options are: ", options);

    let find = {
        "menu": options.menu
    }

    try {
        const client = await GetConnection();
        const db = client.db(process.env.MONGODB_DBNAME);
        const items = await db
            .collection(process.env.MONGODB_PREFIX + 'menus-items')
            .find(find)
            .sort('order', 1)
            .toArray();

        return JSON.parse(JSON.stringify(items));
    } catch (e) {
        console.error(e, "ERROR IN DB");
    }

    return options;
}