class FxFilter {
    static elements = new WeakMap();
    static activeElements = new Set();
    static filters = new Map();
    static filterOptions = new Map();
    static pendingElements = new Set();
    static pendingRoots = new Set();
    static refreshScheduled = false;
    static needsFullScan = false;
    static initialized = false;
    static filterId = 0;
    static resizeObserver = null;
    static mutationObserver = null;

    static add(options) {
        if (typeof options === "string") {
            const name = arguments[0];
            const callback = arguments[1];
            this.filters.set(name, callback);
            this.filterOptions.set(name, { name, callback, updatesOn: [] });
        } else {
            const { name, callback, updatesOn = [] } = options;
            this.filters.set(name, callback);
            this.filterOptions.set(name, { name, callback, updatesOn });
        }
    }

    static init() {
        if ("CSS" in window && "registerProperty" in CSS) {
            try {
                CSS.registerProperty({
                    name: "--fx-filter",
                    syntax: "*",
                    inherits: false,
                    initialValue: "",
                });
            } catch (e) {
                console.log(
                    "CSS registerProperty not supported or already registered"
                );
            }
        }

        if (this.initialized) {
            return;
        }

        this.initialized = true;
        this.setupObservers();
        this.scheduleFullScan();

        window.addEventListener("resize", () => this.scheduleFullScan(), {
            passive: true,
        });
    }

    static setupObservers() {
        this.resizeObserver = new ResizeObserver((entries) => {
            entries.forEach(({ target }) => this.scheduleElementRefresh(target));
        });

        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "attributes") {
                    this.scheduleRootRefresh(mutation.target);
                    return;
                }

                mutation.addedNodes.forEach((node) =>
                    this.scheduleRootRefresh(node)
                );
                mutation.removedNodes.forEach((node) => this.cleanupNode(node));

                if (mutation.target instanceof Element) {
                    this.scheduleElementRefresh(mutation.target);
                }
            });
        });

        this.mutationObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "style"],
        });
    }

    static scheduleFullScan() {
        this.needsFullScan = true;
        this.scheduleRefresh();
    }

    static scheduleRootRefresh(root) {
        if (!(root instanceof Element) || this.isFxNode(root)) {
            return;
        }

        this.pendingRoots.add(root);
        this.scheduleRefresh();
    }

    static scheduleElementRefresh(element) {
        if (!(element instanceof Element) || this.isFxNode(element)) {
            return;
        }

        this.pendingElements.add(element);
        this.scheduleRefresh();
    }

    static scheduleRefresh() {
        if (this.refreshScheduled) {
            return;
        }

        // Batch DOM/style work into a single frame even if several observers fire.
        this.refreshScheduled = true;
        requestAnimationFrame(() => this.flushRefreshQueue());
    }

    static flushRefreshQueue() {
        this.refreshScheduled = false;

        if (this.needsFullScan) {
            this.needsFullScan = false;
            this.pendingRoots.clear();
            this.pendingElements.clear();
            this.scanSubtree(document.body || document.documentElement);
            return;
        }

        const roots = Array.from(this.pendingRoots);
        const elements = Array.from(this.pendingElements);
        this.pendingRoots.clear();
        this.pendingElements.clear();

        roots.forEach((root) => this.scanSubtree(root));
        elements.forEach((element) => this.refreshElement(element));
    }

    static scanSubtree(root) {
        if (!(root instanceof Element)) {
            return;
        }

        this.refreshElement(root);

        root.querySelectorAll("*").forEach((element) => {
            this.refreshElement(element);
        });
    }

    static refreshElement(element) {
        if (!(element instanceof Element) || this.isFxNode(element)) {
            return;
        }

        const fxFilter = this.getFxFilterValue(element);
        const storedState = this.elements.get(element);

        if (!fxFilter) {
            if (storedState?.hasContainer) {
                this.removeFxContainer(element, storedState);
            }

            this.untrackElement(element);
            return;
        }

        const parsedFilter =
            storedState &&
            storedState.filter === fxFilter &&
            storedState.parsedFilter
                ? storedState.parsedFilter
                : this.parseFilterValue(fxFilter);

        const currentStyles = this.getTrackedStyles(
            element,
            fxFilter,
            parsedFilter
        );

        const needsRefresh =
            !storedState ||
            !storedState.hasContainer ||
            storedState.filter !== fxFilter ||
            this.stylesChanged(storedState.trackedStyles, currentStyles);

        if (needsRefresh) {
            this.removeFxContainer(element, storedState);
            const nextState = this.addFxContainer(
                element,
                fxFilter,
                parsedFilter,
                currentStyles
            );

            if (nextState) {
                this.trackElement(element, nextState);
                return;
            }

            this.trackElement(element, {
                filter: fxFilter,
                hasContainer: false,
                trackedStyles: currentStyles,
                parsedFilter,
            });
            return;
        }

        this.trackElement(element, {
            ...storedState,
            filter: fxFilter,
            hasContainer: true,
            trackedStyles: currentStyles,
            parsedFilter,
        });
    }

    static trackElement(element, state) {
        this.elements.set(element, state);

        if (!this.activeElements.has(element)) {
            this.activeElements.add(element);
            this.resizeObserver?.observe(element);
        }
    }

    static untrackElement(element) {
        if (this.activeElements.has(element)) {
            this.activeElements.delete(element);
            this.resizeObserver?.unobserve(element);
        }

        this.elements.delete(element);
    }

    static cleanupNode(node) {
        if (!(node instanceof Element)) {
            return;
        }

        this.untrackElement(node);
        node.querySelectorAll("*").forEach((element) => {
            this.untrackElement(element);
        });
    }

    static isFxNode(element) {
        return (
            element.classList.contains("fx-container") ||
            element.hasAttribute("data-fx-filter-svg")
        );
    }

    static getFxFilterValue(element) {
        const computed = getComputedStyle(element);
        return computed.getPropertyValue("--fx-filter").trim() || null;
    }

    static addFxContainer(element, filterValue, parsedFilter, trackedStyles) {
        const { orderedFilters } =
            parsedFilter || this.parseFilterValue(filterValue);

        const filterParts = [];
        let svgContent = "";

        orderedFilters.forEach((item) => {
            if (item.type === "custom") {
                const filter = item.filter;
                const callback = this.filters.get(filter.name);

                if (callback) {
                    const filterId = `fx-${filter.name}-${++this.filterId}`;
                    const filterContent = callback(element, ...filter.params);

                    if (!filterContent) {
                        return;
                    }

                    svgContent += `<filter id="${filterId}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">${filterContent}</filter>`;

                    filterParts.push(`url(#${filterId})`);
                }
            } else if (item.type === "css") {
                filterParts.push(item.filter);
            }
        });

        const backdropFilter = filterParts.join(" ");

        if (!backdropFilter.trim()) {
            return null;
        }

        const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );
        svg.setAttribute("data-fx-filter-svg", "true");
        svg.style.cssText =
            "position:absolute;width:0;height:0;pointer-events:none;";
        svg.innerHTML = svgContent;

        const container = document.createElement("div");
        container.className = "fx-container";
        // Keep the backdrop node separate so we do not reparse the element subtree.
        container.style.cssText = `
            position:absolute;
            top:0;
            left:0;
            right:0;
            bottom:0;
            backdrop-filter:${backdropFilter};
            background:transparent;
            pointer-events:none;
            z-index:-1;
            overflow:hidden;
            border-radius:inherit;
        `;

        element.append(svg, container);

        return {
            filter: filterValue,
            hasContainer: true,
            trackedStyles,
            parsedFilter,
            svgElement: svg,
            containerElement: container,
        };
    }

    static createUnifiedSVG(customFilters) {
        const svg = document.createElement("svg");
        svg.style.cssText =
            "position: absolute; width: 0; height: 0; pointer-events: none;";

        const filterIds = [];
        let svgContent = "";

        customFilters.forEach((filter) => {
            const callback = this.filters.get(filter.name);

            if (callback) {
                const filterId = `fx-${filter.name}-${++this.filterId}`;
                filterIds.push(filterId);

                const filterContent = callback(...filter.params);
                svgContent += `<filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">${filterContent}</filter>`;
            }
        });

        svg.innerHTML = svgContent;
        return { svg, filterIds };
    }

    static removeFxContainer(element, storedState = this.elements.get(element)) {
        storedState?.containerElement?.remove();
        storedState?.svgElement?.remove();

        if (!storedState) {
            element
                .querySelectorAll(".fx-container, [data-fx-filter-svg]")
                .forEach((el) => el.remove());
        }
    }

    static parseFilterValue(filterValue) {
        const orderedFilters = [];
        const customFilters = [];
        const filterRegex = /(\w+(?:-\w+)*)\s*\(([^)]*)\)/g;

        let match;
        while ((match = filterRegex.exec(filterValue)) !== null) {
            const filterName = match[1];
            const params = match[2];

            if (this.filters.has(filterName)) {
                let paramArray = [];
                if (params.trim() !== "") {
                    paramArray = params
                        .split(",")
                        .map((p) => {
                            const trimmed = p.trim();
                            if (trimmed === "") return undefined;
                            const number = parseFloat(trimmed);
                            return !isNaN(number) ? number : trimmed;
                        })
                        .filter((p) => p !== undefined);
                }
                const customFilter = { name: filterName, params: paramArray };
                customFilters.push(customFilter);
                orderedFilters.push({ type: "custom", filter: customFilter });
            } else {
                orderedFilters.push({
                    type: "css",
                    filter: `${filterName}(${params})`,
                });
            }
        }

        return { orderedFilters, customFilters };
    }

    static getTrackedStyles(element, filterValue, parsedFilter) {
        const { customFilters } =
            parsedFilter || this.parseFilterValue(filterValue);
        const trackedStyles = new Map();
        const computed = getComputedStyle(element);

        customFilters.forEach((filter) => {
            const filterOptions = this.filterOptions.get(filter.name);
            if (filterOptions && filterOptions.updatesOn) {
                filterOptions.updatesOn.forEach((styleProp) => {
                    const value = computed.getPropertyValue(styleProp);
                    trackedStyles.set(styleProp, value);
                });
            }
        });

        return trackedStyles;
    }

    static stylesChanged(oldStyles, newStyles) {
        if (!oldStyles || !newStyles) return true;
        if (oldStyles.size !== newStyles.size) return true;

        for (const [prop, value] of newStyles) {
            if (oldStyles.get(prop) !== value) {
                return true;
            }
        }

        return false;
    }
}

FxFilter.add({
    name: "liquid-glass",
    callback: (element, refraction = 1, offset = 10, chromatic = 0) => {
        const width = Math.round(element.offsetWidth);
        const height = Math.round(element.offsetHeight);
        const refractionValue = parseFloat(refraction) / 2 || 0;
        const offsetValue = (parseFloat(offset) || 0) / 2;
        const chromaticValue = parseFloat(chromatic) || 0;
        const borderRadiusStr =
            window.getComputedStyle(element).borderRadius || "0";

        if (!width || !height) {
            return "";
        }

        if (!FxFilter._cache) FxFilter._cache = new WeakMap();
        if (!FxFilter._resultCache) FxFilter._resultCache = new Map();
        const key = `${width}x${height}-${refractionValue}-${offsetValue}-${chromaticValue}-${borderRadiusStr}`;
        const elemCache = FxFilter._cache.get(element) || {};
        if (elemCache.key === key) return elemCache.result;

        // Different cards often share dimensions, so reuse the generated SVG payload.
        if (FxFilter._resultCache.has(key)) {
            const result = FxFilter._resultCache.get(key);
            FxFilter._cache.set(element, { key, result });
            return result;
        }

        let borderRadius = 0;
        if (borderRadiusStr.includes("%")) {
            const percentage = parseFloat(borderRadiusStr);
            borderRadius = (percentage / 100) * Math.min(width, height);
        } else {
            borderRadius = parseFloat(borderRadiusStr);
        }

        const maxDimension = Math.ceil(Math.max(width, height));

        function createDisplacementMap(refractionMod) {
            const adjustedRefraction = refractionValue + refractionMod;
            const imageData = new ImageData(maxDimension, maxDimension);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                data[i] = 127;
                data[i + 1] = 127;
                data[i + 2] = 127;
                data[i + 3] = 255;
            }

            const half = Math.floor(maxDimension / 2);

            for (let y = 0; y < half; y++) {
                for (let x = 0; x < maxDimension; x++) {
                    const grad = (half - y) / half;
                    const idxTop = (y * maxDimension + x) * 4;
                    const idxBottom =
                        ((maxDimension - 1 - y) * maxDimension + x) * 4;
                    data[idxTop + 2] = Math.max(
                        0,
                        Math.min(
                            255,
                            Math.round(127 + 127 * adjustedRefraction * grad)
                        )
                    );
                    data[idxBottom + 2] = Math.max(
                        0,
                        Math.min(
                            255,
                            Math.round(127 - 127 * adjustedRefraction * grad)
                        )
                    );
                }
            }

            for (let x = 0; x < half; x++) {
                for (let y = 0; y < maxDimension; y++) {
                    const grad = (half - x) / half;
                    const idxLeft = (y * maxDimension + x) * 4;
                    const idxRight =
                        (y * maxDimension + (maxDimension - 1 - x)) * 4;
                    data[idxLeft] = Math.max(
                        0,
                        Math.min(
                            255,
                            Math.round(127 + 127 * adjustedRefraction * grad)
                        )
                    );
                    data[idxRight] = Math.max(
                        0,
                        Math.min(
                            255,
                            Math.round(127 - 127 * adjustedRefraction * grad)
                        )
                    );
                }
            }

            return imageData;
        }

        function createCanvasFromImageData(imageData) {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");

            const offsetX = (maxDimension - width) / 2;
            const offsetY = (maxDimension - height) / 2;
            ctx.putImageData(
                imageData,
                -Math.round(offsetX),
                -Math.round(offsetY)
            );

            if (borderRadius > 0 || offsetValue > 0) {
                const maskCanvas =
                    typeof OffscreenCanvas === "function"
                        ? new OffscreenCanvas(width, height)
                        : document.createElement("canvas");
                maskCanvas.width = width;
                maskCanvas.height = height;
                const maskCtx = maskCanvas.getContext("2d");
                maskCtx.fillStyle = "rgb(127,127,127)";
                maskCtx.beginPath();
                const inset = offsetValue;
                maskCtx.roundRect(
                    inset,
                    inset,
                    width - inset * 2,
                    height - inset * 2,
                    Math.max(0, borderRadius - inset)
                );
                maskCtx.clip();
                maskCtx.fillRect(0, 0, width, height);

                ctx.filter =
                    offsetValue > 0 ? `blur(${offsetValue}px)` : "none";
                ctx.drawImage(maskCanvas, 0, 0, width, height);
            }

            return canvas.toDataURL("image/png");
        }

        let result;
        if (chromaticValue === 0) {
            const img = createDisplacementMap(0);
            const url = createCanvasFromImageData(img);
            result = `
                <feImage result="FEIMG" href="${url}" color-interpolation-filters="sRGB"/>
                <feDisplacementMap in="SourceGraphic" in2="FEIMG" scale="127" xChannelSelector="R" yChannelSelector="B"/>
            `;
        } else {
            const delta = chromaticValue * 0.25;
            const urls = [
                createCanvasFromImageData(createDisplacementMap(delta)),
                createCanvasFromImageData(createDisplacementMap(0)),
                createCanvasFromImageData(createDisplacementMap(-delta)),
            ];

            result = `
                <feImage result="r" href="${urls[0]}" color-interpolation-filters="sRGB"/>
                <feDisplacementMap in="SourceGraphic" in2="r" scale="127" xChannelSelector="R" yChannelSelector="B" result="rDisp"/>
                <feComponentTransfer in="rDisp" result="rCh"><feFuncR type="identity"/><feFuncG type="discrete" tableValues="0"/><feFuncB type="discrete" tableValues="0"/></feComponentTransfer>
                <feImage result="g" href="${urls[1]}" color-interpolation-filters="sRGB"/>
                <feDisplacementMap in="SourceGraphic" in2="g" scale="127" xChannelSelector="R" yChannelSelector="B" result="gDisp"/>
                <feComponentTransfer in="gDisp" result="gCh"><feFuncR type="discrete" tableValues="0"/><feFuncG type="identity"/><feFuncB type="discrete" tableValues="0"/></feComponentTransfer>
                <feImage result="b" href="${urls[2]}" color-interpolation-filters="sRGB"/>
                <feDisplacementMap in="SourceGraphic" in2="b" scale="127" xChannelSelector="R" yChannelSelector="B" result="bDisp"/>
                <feComponentTransfer in="bDisp" result="bCh"><feFuncR type="discrete" tableValues="0"/><feFuncG type="discrete" tableValues="0"/><feFuncB type="identity"/></feComponentTransfer>
                <feComposite in="rCh" in2="gCh" operator="arithmetic" k2="1" k3="1" result="rg"/>
                <feComposite in="rg" in2="bCh" operator="arithmetic" k2="1" k3="1" result="final"/>
            `;
        }

        FxFilter._resultCache.set(key, result);
        FxFilter._cache.set(element, { key, result });
        return result;
    },
    updatesOn: ["border-radius", "width", "height"],
});

FxFilter.init();
