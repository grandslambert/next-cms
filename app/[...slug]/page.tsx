import { promises as fs } from 'fs';
import { CreateElement } from "../includes/UtilFunctions";
import CreateBreadCrumbs from '../components/breadcrumbs';

export default async function Page({ params }: Readonly<{ params: { slug: object } }>) {
    const { slug } = params;
    console.log(slug);
    let page = [];
    const path = Array.prototype.map.call(slug, function (item) { return item.replace('_', '.'); }).join(".");

    try {
        const file = await fs.readFile(process.cwd() + '/content/' + path + '.json', 'utf8');
        page = await JSON.parse(file);
    } catch {
        console.log('Page file not found', process.cwd() + '/content/' + path + '.json');
    }

    return (
        <>
            <CreateBreadCrumbs
                homeElement={'Home'}
                separator={<span className="hidden md:inline"> | </span>}
                activeClasses='text-amber-500'
                containerClasses='md:flex pt-1 pb-2'
                listClasses='hover:underline mx-2 font-bold'
                capitalizeLinks
            />
            {page?.contents ?
                <section id={path} className='px-2'>
                    <h2>{page.title}</h2>
                    {page?.contents.map((item: any) => (
                        <CreateElement key={item.id} item={item} />
                    ))}
                </section> : 
                <section>
                    <h2>OOPS!</h2>
                    <p className='p-2'>Sorry, we could not find the content your were looking for. Please check the URL and try again.</p>
                </section>

            }

        </>
    )
}