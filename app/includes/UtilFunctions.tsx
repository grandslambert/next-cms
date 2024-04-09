import Link from "next/link";
import { createElement } from "react";

export function CreateElement(props: any) {
    const { item } = props;
    const children = new Array();

    if (item.children) {
        item.children.map((child: any) => {
            console.log(child);
            children.push(createElement(
                child.element,
                { className: child.className, href: child.href },
                child.contents
            ))
        })
    }

    let element = createElement(
        item.element,
        { id: item.id, className: item.className },
        item.contents,
        children
    )

    return element;
}