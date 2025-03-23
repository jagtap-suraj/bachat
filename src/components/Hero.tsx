"use client"; // This tells Next.js that this component runs on the client side (in the browser).

import React, { useEffect, useRef } from "react";
import Image from "next/image"; // Import the Image component from Next.js for optimized images.
import { Button } from "@/components/ui/button";
import Link from "next/link"; // Import the Link component from Next.js for client-side navigation.

/**
 * - When the page loads, we see a big title, a description, and two buttons.
 * - The image is tilted slightly to look 3D.
 * - As we scroll down, the image straightens out and moves down a bit, creating a cool effect.
 */
const HeroSection = () => {
  interface HeroSectionProps {}
  // Create a reference (imageRef) to track the image container div.
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const imageElement = imageRef.current; // Get the image container div using the ref.

    if (!imageElement) return; // If the image container doesn't exist, stop here.

    // This function runs every time the user scrolls.
    const handleScroll = () => {
      const scrollPosition = window.scrollY; // Get how far the user has scrolled.
      const scrollThreshold = 100; // Set a scroll threshold (100 pixels).

      // If the user has scrolled more than 100 pixels:
      if (scrollPosition > scrollThreshold) {
        imageElement.classList.add("scrolled"); // Add the "scrolled" class to the image container.
      } else {
        imageElement.classList.remove("scrolled"); // Otherwise, remove the "scrolled" class.
      }
    };

    // Add a scroll event listener to the window.
    window.addEventListener("scroll", handleScroll);

    // Cleanup: Remove the scroll event listener when the component is unmounted.
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="pt-40 pb-20 px-4">
      <div className="container mx-auto text-center">
        {/* Main title with a gradient effect */}
        <h1 className="text-5xl md:text-8xl lg:text-[105px] pb-6 gradient-title">
          Manage Your Finances <br /> with Intelligence
        </h1>

        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          An AI-powered financial management platform that helps you track,
          analyze, and optimize your spending with real-time insights.
        </p>

        <div className="flex justify-center space-x-4">
          <Link href="/dashboard">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Image container with a 3D effect */}
        <div className="hero-image-wrapper mt-5">
          <div ref={imageRef} className="hero-image">
            {/* Image of the dashboard preview */}
            <Image
              src="/banner2.png"
              width={1280}
              height={720}
              alt="Dashboard Preview"
              className="rounded-lg shadow-2xl border mx-auto"
              priority // Load this image with high priority
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
