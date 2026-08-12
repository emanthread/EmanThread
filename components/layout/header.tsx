"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { 
  Menu, 
  Search, 
  ShoppingBag, 
  X, 
  User, 
  ChevronDown,
  LogOut,
  Settings,
  Package,
  Heart,
  LayoutDashboard,
  Ruler
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCartStore } from "@/lib/cart-store";
import { useWishlistStore } from "@/lib/wishlist-store";
import { useAuthStore } from "@/lib/auth-store";
import { SearchModal } from "@/components/search/search-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { catalogUtilityLinks } from "@/lib/navigation/catalog-menu";
import {
  catalogDepartmentFromRootPath,
  shouldShowCatalogNavigation,
} from "@/lib/navigation/storefront-routes";
import { CatalogHeaderMenu } from "./catalog-header-menu";
import { CatalogMobileMenu } from "./catalog-mobile-menu";
import { StitchingNoticeBanner } from "./stitching-notice-banner";
import catalogStyles from "./catalog-header-menu.module.css";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/women", label: "Women" },
  { href: "/men", label: "Men" },
  { href: "/fragrance-beauty", label: "Fragrance & Beauty" },
  { href: "/teens", label: "Teens" },
  { href: "/account/measurements", label: "Stitching" },
];

const categories = [
  { href: "/women", label: "Women", description: "Ready to wear and unstitched" },
  { href: "/men", label: "Men", description: "Tailoring and wardrobe essentials" },
  { href: "/fragrance-beauty", label: "Fragrance & Beauty", description: "Scents, makeup, and care" },
  { href: "/teens", label: "Teens", description: "Styles for younger wardrobes" },
];

function LegacyHeader() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { getTotalItems, openCart } = useCartStore();
  const {
    getTotalItems: getWishlistTotal,
    isIdentityResolved: isWishlistIdentityResolved,
  } = useWishlistStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const totalItems = mounted ? getTotalItems() : 0;
  const wishlistReady = mounted && isWishlistIdentityResolved;
  const wishlistItems = wishlistReady ? getWishlistTotal() : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          isScrolled
            ? "bg-background/95 backdrop-blur-md shadow-sm py-2"
            : "bg-gradient-to-b from-black/65 via-black/35 to-transparent backdrop-blur-[1px] py-4"
        )}
      >
        <StitchingNoticeBanner />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left Section: Mobile Menu & Logo */}
            <div className="flex items-center gap-4 lg:gap-0">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className={cn("lg:hidden", !isScrolled && "text-white hover:bg-white/15")}
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>

              {/* Logo */}
              <Link href="/" className="flex flex-col items-center group">
                <div className={cn(
                  "text-xl md:text-2xl font-serif font-bold tracking-wider transition-colors duration-300 whitespace-nowrap",
                  !isScrolled ? "text-white" : "text-foreground group-hover:text-primary/80"
                )}>
                  Eman Thread
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link
                href="/"
                className={cn(
                  "text-sm font-medium tracking-wide uppercase transition-colors",
                  isScrolled ? "hover:text-accent" : "text-white hover:text-accent"
                )}
              >
                Home
              </Link>
              
              {/* Shop Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1 text-sm font-medium tracking-wide uppercase transition-colors",
                      isScrolled ? "hover:text-accent" : "text-white hover:text-accent"
                    )}
                  >
                    Shop
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px] p-1.5 rounded-xl border-border/50 shadow-xl">
                  <DropdownMenuItem asChild className="px-3 py-2.5 mb-1 cursor-pointer rounded-lg group">
                    <Link href="/women" className="font-bold text-[14px] flex items-center justify-between w-full">
                      <span>Women</span>
                      <ShoppingBag className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/40 mx-2" />
                  <DropdownMenuLabel className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                    Categories
                  </DropdownMenuLabel>
                  <div className="flex flex-col mt-0.5">
                    {categories.map((cat, idx) => [
                      <DropdownMenuItem key={cat.href} asChild className="px-3 py-2.5 cursor-pointer focus:bg-accent/60 transition-colors rounded-lg group">
                        <Link href={cat.href} className="flex flex-col gap-1 w-full items-start">
                          <span className="font-bold text-[14px] text-foreground group-hover:text-primary transition-colors leading-none">{cat.label}</span>
                          <span className="text-[12px] text-muted-foreground/60 font-light leading-none">{cat.description}</span>
                        </Link>
                      </DropdownMenuItem>,
                      idx < categories.length - 1 && (
                        <DropdownMenuSeparator key={`${cat.href}-sep`} className="mx-3 my-0.5 bg-border/40" />
                      )
                    ])}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                href="/women/new-in"
                className={cn(
                  "text-sm font-medium tracking-wide uppercase transition-colors",
                  isScrolled ? "hover:text-accent" : "text-white hover:text-accent"
                )}
              >
                New Arrivals
              </Link>
              <Link
                href="/account/measurements"
                className={cn(
                  "text-sm font-medium tracking-wide uppercase transition-colors",
                  isScrolled ? "hover:text-accent" : "text-white hover:text-accent"
                )}
              >
                Stitching
              </Link>
            </nav>

            {/* Right Navigation */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("hidden sm:flex relative group", !isScrolled && "text-white hover:bg-white/15")}
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Ctrl+K
                </span>
              </Button>

              {/* Theme Toggle */}
              <ThemeToggle
                className={cn(!isScrolled && "text-white hover:bg-white/15")}
              />

              {/* Wishlist Button */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative",
                  !isScrolled && "text-white hover:bg-white/15",
                  !wishlistReady && "invisible",
                )}
                asChild
              >
                <Link href="/wishlist">
                  <Heart className="h-5 w-5" />
                  {wishlistItems > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium animate-in zoom-in-50 duration-200">
                      {wishlistItems}
                    </span>
                  )}
                  <span className="sr-only">Wishlist</span>
                </Link>
              </Button>

              {/* User/Account Dropdown */}
              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("hidden sm:flex", !isScrolled && "text-white hover:bg-white/15")}
                    >
                      <User className="h-5 w-5" />
                      <span className="sr-only">Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.role === "admin" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer">
                            <LayoutDashboard className="h-4 w-4 mr-2" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/orders" className="cursor-pointer">
                        <Package className="h-4 w-4 mr-2" />
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    {wishlistReady ? (
                      <DropdownMenuItem asChild>
                        <Link href="/wishlist" className="cursor-pointer">
                          <Heart className="h-4 w-4 mr-2" />
                          Wishlist
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem asChild>
                      <Link href="/account/settings" className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("hidden sm:flex", !isScrolled && "text-white hover:bg-white/15")}
                  onClick={() => router.push("/login")}
                >
                  <User className="h-5 w-5" />
                  <span className="sr-only">Login</span>
                </Button>
              )}

              {/* Cart Button */}
              <Button
                variant="ghost"
                size="icon"
                className={cn("relative", !isScrolled && "text-white hover:bg-white/15")}
                onClick={openCart}
              >
                <ShoppingBag className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium animate-in zoom-in-50 duration-200">
                    {totalItems}
                  </span>
                )}
                <span className="sr-only">Cart</span>
              </Button>
              {/* Screen-reader cart count announcement */}
              <span aria-live="polite" aria-atomic="true" className="sr-only">
                {mounted && totalItems > 0 ? `Cart: ${totalItems} items` : 'Cart is empty'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile Menu */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-opacity duration-300",
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
      >
        <div
          className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background shadow-xl transition-transform duration-300",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <span className="text-lg font-semibold tracking-wider uppercase">
              Menu
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Mobile Search */}
          <div className="p-4 border-b border-border">
            <Button 
              variant="outline" 
              className="w-full justify-start text-muted-foreground"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsSearchOpen(true);
              }}
            >
              <Search className="h-4 w-4 mr-2" />
              Search products...
            </Button>
          </div>

          <nav className="p-6 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-lg font-medium tracking-wide py-2 hover:text-accent transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            <div className="pt-4 border-t border-border">
              {isAuthenticated && user ? (
                <>
                  <div className="py-2 mb-2">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 py-2 text-accent font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    href="/account"
                    className="flex items-center gap-2 py-2 hover:text-accent transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <Link
                    href="/account/orders"
                    className="flex items-center gap-2 py-2 hover:text-accent transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Package className="h-4 w-4" />
                    My Orders
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 py-2 text-red-600 w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 py-2 hover:text-accent transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Login / Register
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}

function CatalogHeaderV1() {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [publishedCatalogPaths, setPublishedCatalogPaths] = useState<string[]>([]);
  const headerRef = useRef<HTMLElement>(null);
  const { getTotalItems, openCart } = useCartStore();
  const {
    getTotalItems: getWishlistTotal,
    isIdentityResolved: isWishlistIdentityResolved,
  } = useWishlistStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const totalItems = mounted ? getTotalItems() : 0;
  const wishlistReady = mounted && isWishlistIdentityResolved;
  const wishlistItems = wishlistReady ? getWishlistTotal() : 0;
  const showCatalogNavigation = shouldShowCatalogNavigation(pathname);
  const utilityLinks = catalogUtilityLinks
    .filter(
      (link) =>
        link.visibility === "visible" &&
        link.status === "active",
    )
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadPublishedCatalogPaths = () => {
      fetch(`/api/catalog/navigation?_t=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((value: { paths?: unknown } | null) => {
          if (!active || !Array.isArray(value?.paths)) return;
          setPublishedCatalogPaths(
            value.paths.filter((path): path is string => typeof path === "string")
          );
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.warn("Unable to load published catalog navigation", error);
        });
    };

    loadPublishedCatalogPaths();
    const refreshOnFocus = () => loadPublishedCatalogPaths();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hero mode: homepage + not scrolled → transparent navbar overlapping hero
  const isDepartmentRoot = catalogDepartmentFromRootPath(pathname) !== null;
  const isHeroMode = (pathname === "/" || isDepartmentRoot) && !isScrolled;

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--catalog-header-height",
        `${Math.ceil(header.getBoundingClientRect().height)}px`,
      );
    };

    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(
        "--catalog-header-height",
      );
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const accountMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={isAuthenticated ? "Account menu" : "Account and utilities"}
        >
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {isAuthenticated && user ? (
          <>
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user.role === "admin" ? (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem asChild>
              <Link href="/account" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/orders" className="cursor-pointer">
                <Package className="mr-2 h-4 w-4" />
                My Orders
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/login" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Login / Register
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {utilityLinks.map((link) => (
          <DropdownMenuItem key={link.id} asChild>
            <Link href={link.href} className="cursor-pointer">
              {link.id === "stitching" ? (
                <Ruler className="mr-2 h-4 w-4" />
              ) : (
                <ShoppingBag className="mr-2 h-4 w-4" />
              )}
              {link.label}
            </Link>
          </DropdownMenuItem>
        ))}

        {isAuthenticated && user ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void handleLogout()}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const desktopUtilities = (
    <>
      <Link
        href="/account/measurements"
        className="hidden lg:inline-flex items-center text-xs font-medium tracking-widest uppercase px-2 py-1 hover:text-foreground/70 transition-colors"
        aria-label="Stitching services"
      >
        Stitching
      </Link>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        onClick={() => setIsSearchOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>
      <ThemeToggle />
      <Button
        variant="ghost"
        size="icon"
        className={cn("relative", !wishlistReady && "invisible")}
        aria-label={
          wishlistItems > 0
            ? `Wishlist, ${wishlistItems} items`
            : "Wishlist"
        }
        asChild
      >
        <Link href="/wishlist">
          <Heart className="h-5 w-5" />
          {wishlistItems > 0 ? (
            <span className={catalogStyles.mobileCount}>
              {wishlistItems}
            </span>
          ) : null}
        </Link>
      </Button>
      {accountMenu}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={totalItems > 0 ? `Bag, ${totalItems} items` : "Bag"}
        onClick={openCart}
      >
        <ShoppingBag className="h-5 w-5" />
        {totalItems > 0 ? (
          <span className={catalogStyles.mobileCount}>{totalItems}</span>
        ) : null}
      </Button>
    </>
  );

  return (
    <>
      <header ref={headerRef} className={cn(catalogStyles.catalogHeader, isHeroMode && catalogStyles.heroMode)}>
        <StitchingNoticeBanner />
        <div
          className={cn(
            catalogStyles.solidSurface,
            isScrolled && catalogStyles.scrolled,
            isHeroMode && catalogStyles.heroMode,
          )}
        >
          <CatalogHeaderMenu
            mark={
              <Link 
                href="/" 
                aria-label="Eman Thread home"
                onClick={(e) => {
                  if (pathname === "/") {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                Eman Thread
              </Link>
            }
            utilities={desktopUtilities}
            linksEnabled={FEATURE_FLAGS.CATALOG_PAGES_V1}
            showNavigation={showCatalogNavigation}
            publishedCatalogPaths={publishedCatalogPaths}
          />

          <div className={cn(catalogStyles.mobileBar, isHeroMode && catalogStyles.heroMode)}>
            <div className={catalogStyles.mobileBarLeft}>
              <CatalogMobileMenu
                isAuthenticated={isAuthenticated}
                linksEnabled={FEATURE_FLAGS.CATALOG_PAGES_V1}
                showNavigation={showCatalogNavigation}
                publishedCatalogPaths={publishedCatalogPaths}
                user={user}
                utilityLinks={utilityLinks}
                wishlistCount={wishlistItems}
                wishlistReady={wishlistReady}
                onSearch={() => setIsSearchOpen(true)}
                onLogout={handleLogout}
              />
            </div>
            <Link
              href="/"
              className={catalogStyles.mark}
              aria-label="Eman Thread home"
              onClick={(e) => {
                if (pathname === "/") {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              Eman Thread
            </Link>
            <div className={catalogStyles.mobileBarRight}>
              <button
                type="button"
                className={catalogStyles.mobileIconButton}
                aria-label="Search"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search aria-hidden="true" size={19} />
              </button>
              <ThemeToggle className={catalogStyles.mobileIconButton} />
              <button
                type="button"
                className={`${catalogStyles.mobileIconButton} relative`}
                aria-label={
                  totalItems > 0 ? `Bag, ${totalItems} items` : "Bag"
                }
                onClick={openCart}
              >
                <ShoppingBag aria-hidden="true" size={20} />
                {totalItems > 0 ? (
                  <span className={catalogStyles.mobileCount}>
                    {totalItems}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </div>
        <span aria-live="polite" aria-atomic="true" className="sr-only">
          {mounted && totalItems > 0
            ? `Cart: ${totalItems} items`
            : "Cart is empty"}
        </span>
      </header>
      {pathname === "/" ? (
        <div
          className={catalogStyles.homeHeaderSpacer}
          style={isHeroMode ? { height: 0 } : undefined}
          aria-hidden="true"
        />
      ) : null}

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}

export function Header() {
  return FEATURE_FLAGS.CATALOG_HEADER_V1 ? (
    <CatalogHeaderV1 />
  ) : (
    <LegacyHeader />
  );
}
