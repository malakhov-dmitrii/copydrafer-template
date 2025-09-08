import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ArrowRight,
	BarChart,
	Globe,
	Shield,
	Sparkles,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";

export default function MarketingHome() {
	return (
		<>
			{/* Hero Section */}
			<section className="relative overflow-hidden py-24 sm:py-32">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="text-center">
						<div className="mb-6 inline-flex items-center rounded-full border bg-muted px-3 py-1">
							<Sparkles className="mr-2 h-4 w-4 text-primary" />
							<span className="text-muted-foreground text-sm">
								Introducing AI-Powered Content
							</span>
						</div>
						<h1 className="mb-6 font-bold text-4xl text-foreground sm:text-6xl">
							Create Amazing Content
							<span className="block text-primary">In Seconds, Not Hours</span>
						</h1>
						<p className="mx-auto mb-8 max-w-3xl text-muted-foreground text-xl">
							Transform your ideas into polished content with our AI-powered
							platform. Write, edit, and optimize content that engages your
							audience and drives results.
						</p>
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button size="lg" asChild>
								<Link href="/sign-up">
									Start Free Trial
									<ArrowRight className="ml-2 h-5 w-5" />
								</Link>
							</Button>
							<Button size="lg" variant="outline" asChild>
								<Link href="/demo">Watch Demo</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* Features Grid */}
			<section className="py-24">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="mb-16 text-center">
						<h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl">
							Everything You Need to Create
						</h2>
						<p className="mx-auto max-w-2xl text-muted-foreground text-xl">
							Powerful features designed to streamline your content creation
							workflow
						</p>
					</div>
					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						<Card className="transition-all hover:shadow-lg">
							<CardHeader>
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
									<Zap className="h-6 w-6 text-primary-foreground" />
								</div>
								<CardTitle>Lightning Fast</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription>
									Generate high-quality content in seconds with our advanced AI
									algorithms.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="transition-all hover:shadow-lg">
							<CardHeader>
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
									<Shield className="h-6 w-6 text-primary-foreground" />
								</div>
								<CardTitle>Brand Consistency</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription>
									Maintain your unique voice and style across all content with
									custom brand profiles.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="transition-all hover:shadow-lg">
							<CardHeader>
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
									<Users className="h-6 w-6 text-primary-foreground" />
								</div>
								<CardTitle>Team Collaboration</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription>
									Work together seamlessly with real-time collaboration and
									feedback tools.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="transition-all hover:shadow-lg">
							<CardHeader>
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
									<BarChart className="h-6 w-6 text-primary-foreground" />
								</div>
								<CardTitle>Analytics & Insights</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription>
									Track performance and optimize your content strategy with
									detailed analytics.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="transition-all hover:shadow-lg">
							<CardHeader>
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
									<Globe className="h-6 w-6 text-primary-foreground" />
								</div>
								<CardTitle>Multi-Language</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription>
									Create content in over 30 languages with native-level quality
									and accuracy.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="transition-all hover:shadow-lg">
							<CardHeader>
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
									<Sparkles className="h-6 w-6 text-primary-foreground" />
								</div>
								<CardTitle>AI Templates</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription>
									Choose from hundreds of pre-built templates for every content
									need.
								</CardDescription>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-24">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<Card className="bg-primary p-12 text-center">
						<CardHeader>
							<CardTitle className="mb-4 font-bold text-3xl text-primary-foreground sm:text-4xl">
								Ready to Transform Your Content?
							</CardTitle>
							<CardDescription className="mx-auto max-w-2xl text-primary-foreground/90 text-xl">
								Join thousands of creators and businesses already using
								Copydrafer to scale their content.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="mb-6 flex flex-col justify-center gap-4 sm:flex-row">
								<Button size="lg" variant="secondary" asChild>
									<Link href="/sign-up">
										Start Your Free Trial
										<ArrowRight className="ml-2 h-5 w-5" />
									</Link>
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
									asChild
								>
									<Link href="/pricing">View Pricing</Link>
								</Button>
							</div>
							<p className="text-primary-foreground/70 text-sm">
								No credit card required • 14-day free trial • Cancel anytime
							</p>
						</CardContent>
					</Card>
				</div>
			</section>
		</>
	);
}
