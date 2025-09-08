"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
	Check,
	ChevronDown,
	Clock,
	GitBranch,
	Loader2,
	Plus,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

export interface Version {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
	content: string;
	isActive?: boolean;
	aiGenerated?: boolean;
	parentVersionId?: string;
}

interface VersionSelectorProps {
	versions: Version[];
	currentVersionId: string;
	onVersionChange: (versionId: string) => void;
	onVersionCreate?: () => void;
	onVersionDelete?: (versionId: string) => void;
	allowCreate?: boolean;
	showTimestamps?: boolean;
	loading?: boolean;
	compareMode?: boolean;
	compareVersionId?: string;
	className?: string;
}

export function VersionSelector({
	versions,
	currentVersionId,
	onVersionChange,
	onVersionCreate,
	onVersionDelete,
	allowCreate = false,
	showTimestamps = false,
	loading = false,
	compareMode = false,
	compareVersionId,
	className,
}: VersionSelectorProps) {
	const [open, setOpen] = useState(false);

	const currentVersion = useMemo(
		() => versions.find((v) => v.id === currentVersionId),
		[versions, currentVersionId],
	);

	const compareVersion = useMemo(
		() =>
			compareMode && compareVersionId
				? versions.find((v) => v.id === compareVersionId)
				: null,
		[versions, compareMode, compareVersionId],
	);

	const sortedVersions = useMemo(
		() => [...versions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
		[versions],
	);

	const handleVersionSelect = (versionId: string) => {
		onVersionChange(versionId);
		setOpen(false);
	};

	const handleVersionDelete = (e: React.MouseEvent, versionId: string) => {
		e.stopPropagation();
		onVersionDelete?.(versionId);
	};

	if (loading) {
		return (
			<div className={cn("flex items-center gap-2", className)}>
				<Loader2 className="h-4 w-4 animate-spin" aria-label="Loading" />
				<span className="text-muted-foreground text-sm">Loading versions...</span>
			</div>
		);
	}

	if (versions.length === 0) {
		return (
			<div className={cn("flex items-center gap-2", className)}>
				<GitBranch className="h-4 w-4 text-muted-foreground" />
				<span className="text-muted-foreground text-sm">No versions</span>
				{allowCreate && onVersionCreate && (
					<Button size="sm" variant="outline" onClick={onVersionCreate}>
						<Plus className="mr-1 h-3 w-3" />
						Create First Version
					</Button>
				)}
			</div>
		);
	}

	if (compareMode && compareVersion) {
		return (
			<div className={cn("flex items-center gap-2", className)}>
				<GitBranch className="h-4 w-4 text-primary" />
				<span className="text-sm">Comparing:</span>
				<Badge variant="outline">{currentVersion?.name}</Badge>
				<span className="text-muted-foreground text-sm">with</span>
				<Badge variant="outline">{compareVersion.name}</Badge>
			</div>
		);
	}

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn("w-[200px] justify-between", className)}
					role="button"
				>
					<div className="flex items-center gap-2">
						<GitBranch className="h-4 w-4" />
						<span className="truncate">{currentVersion?.name || "Select Version"}</span>
						{currentVersion?.aiGenerated && (
							<Sparkles className="h-3 w-3 text-primary" />
						)}
					</div>
					<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-[250px]">
				<DropdownMenuLabel>Content Versions</DropdownMenuLabel>
				<DropdownMenuSeparator />
				
				{sortedVersions.map((version) => (
					<DropdownMenuItem
						key={version.id}
						onClick={() => handleVersionSelect(version.id)}
						className="flex items-center justify-between"
					>
						<div className="flex flex-1 items-center gap-2">
							{version.id === currentVersionId && (
								<Check className="h-4 w-4 text-primary" />
							)}
							<div className="flex flex-1 flex-col">
								<div className="flex items-center gap-1">
									<span className="text-sm">{version.name}</span>
									{version.aiGenerated && (
										<Badge variant="secondary" className="ai-badge h-4 px-1 text-xs">
											AI
										</Badge>
									)}
								</div>
								{showTimestamps && (
									<div className="flex items-center gap-1 text-muted-foreground text-xs">
										<Clock className="h-3 w-3" />
										{format(version.updatedAt, "MMM d, yyyy")}
									</div>
								)}
							</div>
						</div>
						{onVersionDelete && !version.isActive && (
							<Button
								size="sm"
								variant="ghost"
								className="h-6 w-6 p-0"
								onClick={(e) => handleVersionDelete(e, version.id)}
								disabled={version.isActive}
								aria-label="Delete version"
							>
								<Trash2 className="h-3 w-3" />
							</Button>
						)}
					</DropdownMenuItem>
				))}
				
				{allowCreate && onVersionCreate && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onVersionCreate}>
							<Plus className="mr-2 h-4 w-4" />
							Create New Version
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}