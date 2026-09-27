import { Link } from 'react-router-dom'
import { useApp } from '../App'

function Landing() {
    const { user } = useApp()

    return (
        <div className="page">
            {/* Navigation */}
            <nav className="navbar">
                <div className="navbar-content">
                    <Link to="/" className="navbar-logo">
                        <span className="navbar-logo-icon">⚡</span>
                        Smart Link Hub
                    </Link>
                    <div className="navbar-nav">
                        {user ? (
                            <Link to="/dashboard" className="btn btn-primary">
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="navbar-link">Log In</Link>
                                <Link to="/login" className="btn btn-primary">Get Started</Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <h1 className="hero-title animate-slide-up">
                        One Link to Rule<br />
                        <span className="hero-title-accent">All Your Links</span>
                    </h1>
                    <p className="hero-subtitle animate-fade-in">
                        Create smart link hubs that dynamically adapt based on time, device,
                        and location. Track clicks and optimize your digital presence.
                    </p>
                    <div className="hero-actions animate-fade-in">
                        <Link to={user ? "/hub/new" : "/login"} className="btn btn-primary btn-lg">
                            Create Your Hub
                            <span>→</span>
                        </Link>
                        <a href="#features" className="btn btn-secondary btn-lg">
                            Learn More
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-2xl">
                <div className="container">
                    <h2 className="text-3xl font-bold text-center mb-xl">
                        Why Choose <span className="text-accent">Smart Link Hub?</span>
                    </h2>
                    <div className="grid grid-cols-3 lg:grid-cols-3">
                        <FeatureCard
                            icon="🎯"
                            title="Smart Rules"
                            description="Show different links based on time, device, or location. Your hub adapts to your audience."
                        />
                        <FeatureCard
                            icon="📊"
                            title="Real-Time Analytics"
                            description="Track every click with detailed insights. Know what works and optimize your links."
                        />
                        <FeatureCard
                            icon="⚡"
                            title="Lightning Fast"
                            description="Optimized for speed. Your visitors get the best experience with instant loading."
                        />
                        <FeatureCard
                            icon="🎨"
                            title="Fully Customizable"
                            description="Match your brand with custom themes, colors, and layouts. Make it yours."
                        />
                        <FeatureCard
                            icon="📱"
                            title="Mobile First"
                            description="Beautiful on every device. Responsive design that looks great everywhere."
                        />
                        <FeatureCard
                            icon="🔒"
                            title="Secure & Reliable"
                            description="Your data is safe with us. Enterprise-grade security for peace of mind."
                        />
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-2xl" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="container">
                    <h2 className="text-3xl font-bold text-center mb-xl">
                        How It <span className="text-accent">Works</span>
                    </h2>
                    <div className="grid grid-cols-3 lg:grid-cols-3 gap-lg">
                        <StepCard
                            number="1"
                            title="Create Your Hub"
                            description="Sign up and create your first smart link hub in seconds."
                        />
                        <StepCard
                            number="2"
                            title="Add Your Links"
                            description="Add all your important links and set up smart display rules."
                        />
                        <StepCard
                            number="3"
                            title="Share & Track"
                            description="Share your unique URL and watch the analytics roll in."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-2xl">
                <div className="container text-center">
                    <h2 className="text-3xl font-bold mb-md">
                        Ready to Get Started?
                    </h2>
                    <p className="text-secondary mb-lg" style={{ maxWidth: '500px', margin: '0 auto var(--spacing-lg)' }}>
                        Join thousands of creators, businesses, and professionals who trust Smart Link Hub.
                    </p>
                    <Link to={user ? "/hub/new" : "/login"} className="btn btn-primary btn-lg">
                        Create Your Free Hub
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid var(--color-border-secondary)',
                padding: 'var(--spacing-xl) 0'
            }}>
                <div className="container flex justify-between items-center">
                    <div className="flex items-center gap-sm">
                        <span className="text-accent">⚡</span>
                        <span className="font-semibold">Smart Link Hub</span>
                    </div>
                    <p className="text-tertiary text-sm">
                        © 2024 Smart Link Hub. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}

function FeatureCard({ icon, title, description }) {
    return (
        <div className="card">
            <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-md)' }}>
                {icon}
            </div>
            <h3 className="text-lg font-semibold mb-sm">{title}</h3>
            <p className="text-secondary">{description}</p>
        </div>
    )
}

function StepCard({ number, title, description }) {
    return (
        <div className="card text-center">
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-accent-primary)',
                color: 'var(--color-text-inverse)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-bold)',
                margin: '0 auto var(--spacing-md)'
            }}>
                {number}
            </div>
            <h3 className="text-lg font-semibold mb-sm">{title}</h3>
            <p className="text-secondary">{description}</p>
        </div>
    )
}

export default Landing
