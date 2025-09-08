import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { auth } from "@/server/auth";
import {
	ArrowDown,
	ArrowUp,
	Clock,
	FileText,
	MoreHorizontal,
	Plus,
	TrendingUp,
	Users,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";

export default async function DashboardPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const stats = [
		{
			name: "Total Content",
			value: "24",
			change: "+12%",
			changeType: "increase",
			icon: FileText,
		},
		{
			name: "Total Views",
			value: "8,429",
			change: "+23%",
			changeType: "increase",
			icon: TrendingUp,
		},
		{
			name: "Team Members",
			value: "4",
			change: "0%",
			changeType: "neutral",
			icon: Users,
		},
		{
			name: "Avg. Time Saved",
			value: "2.4h",
			change: "+18%",
			changeType: "increase",
			icon: Clock,
		},
	];

	const recentContent = [
		{
			id: 1,
			title: "Getting Started with Next.js 15",
			type: "Blog Post",
			status: "Published",
			date: "2 hours ago",
			views: 234,
		},
		{
			id: 2,
			title: "Product Launch Email Campaign",
			type: "Email",
			status: "Draft",
			date: "5 hours ago",
			views: 0,
		},
		{
			id: 3,
			title: "Social Media Content Calendar",
			type: "Social",
			status: "Published",
			date: "1 day ago",
			views: 1289,
		},
		{
			id: 4,
			title: "Q4 Marketing Strategy",
			type: "Document",
			status: "In Review",
			date: "2 days ago",
			views: 45,
		},
	];

	return (
		<div>
			{/* Welcome Section */}
			<div className="mb-8">
				<h2 className="mb-2 font-bold text-2xl text-foreground">
					Welcome back, {session?.user.name || "there"}!
				</h2>
				<p className="text-muted-foreground">
					Here's what's happening with your content today.
				</p>
			</div>

			{/* Stats Grid */}
			<div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat) => (
					<Card key={stat.name}>
						<CardContent className="p-6">
							<div className="mb-4 flex items-center justify-between">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
									<stat.icon className="h-5 w-5 text-primary" />
								</div>
								<Badge
									variant={
										stat.changeType === "increase"
											? "default"
											: stat.changeType === "decrease"
												? "destructive"
												: "secondary"
									}
									className="flex items-center"
								>
									{stat.change}
									{stat.changeType === "increase" && (
										<ArrowUp className="ml-1 h-3 w-3" />
									)}
									{stat.changeType === "decrease" && (
										<ArrowDown className="ml-1 h-3 w-3" />
									)}
								</Badge>
							</div>
							<div>
								<p className="font-bold text-2xl text-foreground">
									{stat.value}
								</p>
								<p className="mt-1 text-muted-foreground text-sm">
									{stat.name}
								</p>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Recent Content */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Recent Content</CardTitle>
						<Button variant="link" asChild>
							<Link href="/dashboard/content">View all</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b">
									<th className="px-6 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
										Title
									</th>
									<th className="px-6 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
										Type
									</th>
									<th className="px-6 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
										Status
									</th>
									<th className="px-6 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
										Views
									</th>
									<th className="px-6 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
										Date
									</th>
									<th className="px-6 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{recentContent.map((content) => (
									<tr key={content.id} className="hover:bg-muted/50">
										<td className="whitespace-nowrap px-6 py-4">
											<div className="font-medium text-foreground text-sm">
												{content.title}
											</div>
										</td>
										<td className="whitespace-nowrap px-6 py-4">
											<span className="text-muted-foreground text-sm">
												{content.type}
											</span>
										</td>
										<td className="whitespace-nowrap px-6 py-4">
											<Badge
												variant={
													content.status === "Published"
														? "default"
														: content.status === "Draft"
															? "secondary"
															: "outline"
												}
											>
												{content.status}
											</Badge>
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-muted-foreground text-sm">
											{content.views.toLocaleString()}
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-muted-foreground text-sm">
											{content.date}
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-right font-medium text-sm">
											<Button variant="ghost" size="sm">
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Quick Actions */}
			<div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<Card className="group transition-shadow hover:shadow-md">
					<CardContent className="p-6">
						<Link
							href="/dashboard/content/new"
							className="flex items-center justify-between"
						>
							<div>
								<CardTitle className="mb-1 text-lg">
									Create New Content
								</CardTitle>
								<CardDescription>
									Start writing with AI assistance
								</CardDescription>
							</div>
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
								<Plus className="h-5 w-5 text-primary" />
							</div>
						</Link>
					</CardContent>
				</Card>
				<Card className="group transition-shadow hover:shadow-md">
					<CardContent className="p-6">
						<Link
							href="/dashboard/templates"
							className="flex items-center justify-between"
						>
							<div>
								<CardTitle className="mb-1 text-lg">Browse Templates</CardTitle>
								<CardDescription>
									Find the perfect starting point
								</CardDescription>
							</div>
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
								<FileText className="h-5 w-5 text-primary" />
							</div>
						</Link>
					</CardContent>
				</Card>
				<Card className="group transition-shadow hover:shadow-md">
					<CardContent className="p-6">
						<Link
							href="/dashboard/analytics"
							className="flex items-center justify-between"
						>
							<div>
								<CardTitle className="mb-1 text-lg">View Analytics</CardTitle>
								<CardDescription>
									Track your content performance
								</CardDescription>
							</div>
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
								<TrendingUp className="h-5 w-5 text-primary" />
							</div>
						</Link>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
