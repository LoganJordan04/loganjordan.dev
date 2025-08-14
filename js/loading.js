// Loading screen management
export class LoadingManager {
    constructor() {
        this.loadingScreen = document.getElementById("loading-container");
        this.loadingAnimation = document.getElementById("loading-animation");
        this.isComplete = false;
        this.hasStartedPlaying = false;
        this.loadingTimer = null;
        this.loadingDuration = 4000;

        this.init();
    }

    init() {
        // Make content unfocusable underneath loading screen
        this.setInertState(true);
        
        this.playVideo();

        // Set timer to remove loading screen
        this.loadingTimer = setTimeout(() => {
            this.removeLoadingScreen();
        }, this.loadingDuration);

        // Dev: Click to skip loading screen
        this.setupSkipFeature();
    }

    setInertState(isLoading) {
        const smoothWrapper = document.getElementById("smooth-wrapper");
        const header = document.querySelector("header");

        if (isLoading) {
            // Make content inert during loading
            if (smoothWrapper) smoothWrapper.setAttribute("inert", "");
            if (header) header.setAttribute("inert", "");
        } else {
            // Remove inert when loading is complete
            if (smoothWrapper) smoothWrapper.removeAttribute("inert");
            if (header) header.removeAttribute("inert");
        }
    }

    setupSkipFeature() {
        if (!this.loadingScreen) return;

        const skipLoading = (e) => {
            // Prevent event from bubbling
            e.stopPropagation();
            e.preventDefault();

            // Clear the timer
            if (this.loadingTimer) {
                clearTimeout(this.loadingTimer);
                this.loadingTimer = null;
            }

            // Skip directly to removal
            this.removeLoadingScreen(true);

            // Remove the event listener
            this.loadingScreen.removeEventListener("click", skipLoading);
        };

        // Add click listener to loading screen
        this.loadingScreen.addEventListener("click", skipLoading);
    }

    async playVideo() {
        if (!this.loadingAnimation) {
            console.log("signature-animation.webm not found!");
            return;
        }

        try {
            if (!this.hasStartedPlaying) {
                this.loadingAnimation.currentTime = 0;
            }
            this.loadingAnimation.muted = true;

            const playPromise = this.loadingAnimation.play();

            if (playPromise !== undefined) {
                await playPromise;
                this.hasStartedPlaying = true;

                // Add event listener to prevent restarting
                this.loadingAnimation.addEventListener(
                    "playing",
                    () => {
                        this.hasStartedPlaying = true;
                    },
                    { once: true }
                );
            }
        } catch (error) {
            console.log("Animation autoplay blocked:", error);

            if (!this.hasStartedPlaying) {
                // Try to play on first user interaction
                const playOnInteraction = async () => {
                    try {
                        // Don't reset currentTime on retry
                        await this.loadingAnimation.play();
                        this.hasStartedPlaying = true;
                        console.log("Animation started after user interaction");
                    } catch (e) {
                        console.log("Animation still cannot play:", e);
                    }
                    // Remove listeners after first attempt
                    document.removeEventListener("click", playOnInteraction);
                    document.removeEventListener(
                        "touchstart",
                        playOnInteraction
                    );
                    document.removeEventListener("keydown", playOnInteraction);
                };

                document.addEventListener("click", playOnInteraction);
                document.addEventListener("touchstart", playOnInteraction);
                document.addEventListener("keydown", playOnInteraction);
            }
        }
    }

    removeLoadingScreen(skipFading = false) {
        this.setInertState(false);
        
        if (this.isComplete) {
            return;
        }

        this.isComplete = true;

        if (skipFading) {
            // Skip fading animation and remove immediately
            if (this.loadingScreen && this.loadingScreen.parentNode) {
                this.loadingScreen.remove();
            }
            document.body.classList.remove("loading-active");
            return;
        }

        // Fade out the animation first
        if (this.loadingAnimation) {
            this.loadingAnimation.classList.add("loading-fade-out");
        }

        // Then fade out the container
        setTimeout(() => {
            if (this.loadingScreen) {
                this.loadingScreen.classList.add("loading-fade-out");
            }

            // After fade animation completes, remove from DOM
            setTimeout(() => {
                if (this.loadingScreen && this.loadingScreen.parentNode) {
                    this.loadingScreen.remove();
                }
                document.body.classList.remove("loading-active");
            }, 500); // Wait for CSS transition
        }, 300);
    }
}
