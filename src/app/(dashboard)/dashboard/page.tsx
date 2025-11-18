import {
  ArrowDown,
  ArrowUp,
  Clock,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { auth } from "@/server/auth";

type ChangeType = "increase" | "decrease" | "neutral";
type ContentStatus = "Published" | "Draft" | "Scheduled";

function getChangeVariant(changeType: ChangeType) {
  if (changeType === "increase") return "default";
  if (changeType === "decrease") return "destructive";
  return "secondary";
}

function getStatusVariant(status: ContentStatus) {
  if (status === "Published") return "default";
  if (status === "Draft") return "secondary";
  return "outline";
}

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
    <div className="flex flex-col gap-4 p-3">
      {/* Welcome Section */}
      <div>
        <h2 className="mb-1 font-bold text-foreground text-xl leading-tight">
          Welcome back, {session?.user.name || "there"}!
        </h2>
        <p className="text-muted-foreground text-sm">
          Here's what's happening with your content today.
        </p>
      </div>

      <Separator />

      {/* Main Grid: Stats + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Stats Grid - Takes 2 columns on desktop */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          <TooltipProvider>
            {stats.map((stat) => (
              <Card
                className="transition-shadow hover:shadow-sm"
                key={stat.name}
              >
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <stat.icon className="h-4 w-4 text-primary" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{stat.name}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge
                      className="flex items-center text-xs"
                      variant={getChangeVariant(stat.changeType as ChangeType)}
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
                    <p className="font-bold text-foreground text-xl leading-none">
                      {stat.value}
                    </p>
                    <p className="mt-1.5 text-muted-foreground text-sm">
                      {stat.name}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TooltipProvider>
        </div>

        {/* Quick Actions - Single column on desktop */}
        <div className="flex flex-col gap-4">
          <Card className="group transition-shadow hover:shadow-sm">
            <CardContent className="p-4">
              <Link
                className="flex items-center justify-between"
                href="/dashboard/content/new"
              >
                <div className="flex-1">
                  <CardTitle className="mb-0.5 text-base">
                    Create New Content
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Start writing with AI
                  </CardDescription>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
              </Link>
            </CardContent>
          </Card>
          <Card className="group transition-shadow hover:shadow-sm">
            <CardContent className="p-4">
              <Link
                className="flex items-center justify-between"
                href="/dashboard/templates"
              >
                <div className="flex-1">
                  <CardTitle className="mb-0.5 text-base">
                    Browse Templates
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Find the perfect starting point
                  </CardDescription>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              </Link>
            </CardContent>
          </Card>
          <Card className="group transition-shadow hover:shadow-sm">
            <CardContent className="p-4">
              <Link
                className="flex items-center justify-between"
                href="/dashboard/analytics"
              >
                <div className="flex-1">
                  <CardTitle className="mb-0.5 text-base">
                    View Analytics
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Track your performance
                  </CardDescription>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Recent Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Content</CardTitle>
            <Button asChild className="h-auto p-0" size="sm" variant="link">
              <Link href="/dashboard/content">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-sm">Title</TableHead>
                <TableHead className="font-semibold text-sm">Type</TableHead>
                <TableHead className="font-semibold text-sm">Status</TableHead>
                <TableHead className="font-semibold text-sm">Views</TableHead>
                <TableHead className="font-semibold text-sm">Date</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentContent.map((content) => (
                <TableRow key={content.id}>
                  <TableCell className="font-medium text-sm">
                    {content.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {content.type}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className="text-xs"
                      variant={getStatusVariant(content.status as ContentStatus)}
                    >
                      {content.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {content.views.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {content.date}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="h-8 w-8 p-0"
                          size="sm"
                          variant="ghost"
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
