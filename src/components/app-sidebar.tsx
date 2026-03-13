"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ImageDown, CoffeeIcon, Heart, ChevronUp } from "lucide-react";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar";

const tools = [
    {
        title: "Image Compressor",
        url: "/image-compressor",
        icon: ImageDown,
    },
];

const supportLinks = [
    {
        title: "Buy me a coffee",
        href: "https://www.buymeacoffee.com/louvre_",
        emoji: "☕",
    },
    {
        title: "Saweria (ID 🇮🇩)",
        href: "https://saweria.co/louvre325",
        emoji: "💸",
    },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <Image
                                    src="/icon.png"
                                    alt="Tools bylouis.io"
                                    width={24}
                                    height={32}
                                    className="rounded-lg size-8"
                                />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold"></span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Tools</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {tools.map((tool) => (
                                <SidebarMenuItem key={tool.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === tool.url}
                                        tooltip={tool.title}
                                    >
                                        <Link href={tool.url}>
                                            <tool.icon />
                                            <span>{tool.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <Collapsible className="group/collapsible">
                        <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton tooltip="Support">
                                    <Heart className="size-4" />
                                    <span>Support</span>
                                    <ChevronUp className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <SidebarMenuSub>
                                    {supportLinks.map((link) => (
                                        <SidebarMenuSubItem key={link.title}>
                                            <SidebarMenuSubButton asChild>
                                                <a
                                                    href={link.href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <span>{link.emoji}</span>
                                                    <span>{link.title}</span>
                                                </a>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
