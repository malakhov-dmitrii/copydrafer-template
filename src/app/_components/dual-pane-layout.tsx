"use client";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface DualPaneLayoutProps {
	leftPanel: React.ReactNode;
	rightPanel: React.ReactNode;
	defaultSize?: [number, number];
	minSize?: number;
	maxSize?: number;
	className?: string;
	onResize?: (sizes: number[]) => void;
	persistenceKey?: string;
}

export function DualPaneLayout({
	leftPanel,
	rightPanel,
	defaultSize = [60, 40],
	minSize = 30,
	maxSize = 70,
	className,
	onResize,
	persistenceKey = "dual-pane-layout",
}: DualPaneLayoutProps) {
	const [sizes, setSizes] = useState<number[]>(defaultSize);
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	useEffect(() => {
		if (persistenceKey && typeof window !== "undefined") {
			const savedSizes = localStorage.getItem(`${persistenceKey}-sizes`);
			if (savedSizes) {
				try {
					const parsed = JSON.parse(savedSizes);
					if (Array.isArray(parsed) && parsed.length === 2) {
						setSizes(parsed);
					}
				} catch (e) {
					console.error("Failed to parse saved panel sizes");
				}
			}
		}
	}, [persistenceKey]);

	const handleResize = (newSizes: number[]) => {
		setSizes(newSizes);

		if (persistenceKey && typeof window !== "undefined") {
			localStorage.setItem(`${persistenceKey}-sizes`, JSON.stringify(newSizes));
		}

		onResize?.(newSizes);
	};

	if (isMobile) {
		return (
			<div className={cn("flex h-full flex-col", className)}>
				<div className="flex-1 overflow-hidden">{leftPanel}</div>
				<div className="h-1/3 border-t bg-muted/30">{rightPanel}</div>
			</div>
		);
	}

	return (
		<ResizablePanelGroup
			direction="horizontal"
			className={cn("h-full w-full", className)}
			onLayout={handleResize}
		>
			<ResizablePanel
				defaultSize={sizes[0]}
				minSize={minSize}
				maxSize={maxSize}
			>
				<div className="h-full overflow-hidden">{leftPanel}</div>
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel
				defaultSize={sizes[1]}
				minSize={100 - maxSize}
				maxSize={100 - minSize}
			>
				<div className="h-full overflow-hidden">{rightPanel}</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
