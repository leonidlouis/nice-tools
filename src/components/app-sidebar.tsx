"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ImageDown, Video, CoffeeIcon, Heart, ChevronUp, KeyRound, Fingerprint, ShieldCheck, Clock, Zap, Palette, ShieldOff, Ruler } from "lucide-react";

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
    SidebarSeparator,
} from "@/components/ui/sidebar";
import React from "react";

const toolGroups = [
    {
        name: "Media",
        tools: [
            {
                title: "Image Compressor",
                url: "/image-compressor",
                icon: ImageDown,
            },
            {
                title: "Video Converter",
                url: "/video-converter",
                icon: Video,
            },
            /* {
                title: "SVG Optimizer",
                url: "/svg-optimizer",
                icon: Zap,
            },
            {
                title: "EXIF Stripper",
                url: "/exif-stripper",
                icon: ShieldOff,
            },
            {
                title: "Color Palette",
                url: "/color-palette",
                icon: Palette,
            }, */
        ],
    },
    {
        name: "Misc",
        tools: [
            {
                title: "Password Generator",
                url: "/password-generator",
                icon: KeyRound,
            },
        ],
    },
    {
        name: "Devtools",
        tools: [
            {
                title: "Cron Visualizer",
                url: "/cron-visualizer",
                icon: Clock,
            },
            /* {
                title: "Unit Converter",
                url: "/unit-converter",
                icon: Ruler,
            },
            {
                title: "JWT Debugger",
                url: "/jwt-debugger",
                icon: ShieldCheck,
            }, */
            {
                title: "UUID Generator",
                url: "/uuid-generator",
                icon: Fingerprint,
            },
        ],
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
                {toolGroups.map((group, index) => (
                    <React.Fragment key={group.name}>
                        <SidebarGroup>
                            <SidebarGroupLabel>{group.name}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {group.tools.map((tool) => (
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
                        {index < toolGroups.length - 1 && <SidebarSeparator className="mx-2" />}
                    </React.Fragment>
                ))}
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
