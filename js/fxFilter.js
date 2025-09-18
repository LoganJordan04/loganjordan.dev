class FxFilter {
    static elements = new WeakMap();
    static filters = new Map();
    static filterOptions = new Map();
    static running = false;

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

        if (!this.running) {
            this.running = true;
            this.tick();
        }
    }

    static tick() {
        this.scanElements();
        requestAnimationFrame(() => this.tick());
    }

    static scanElements() {
        document
            .querySelectorAll("*:not(.fx-container):not(svg)")
            .forEach((element) => {
                const fxFilter = this.getFxFilterValue(element);
                const storedState = this.elements.get(element);

                if (fxFilter) {
                    let parsedFilter;
                    if (
                        storedState &&
                        storedState.filter === fxFilter &&
                        storedState.parsedFilter
                    ) {
                        parsedFilter = storedState.parsedFilter;
                    } else {
                        parsedFilter = this.parseFilterValue(fxFilter);
                    }

                    const currentStyles = this.getTrackedStyles(
                        element,
                        fxFilter,
                        parsedFilter
                    );

                    if (!storedState) {
                        this.addFxContainer(element, fxFilter, parsedFilter);
                        this.elements.set(element, {
                            filter: fxFilter,
                            hasContainer: true,
                            trackedStyles: currentStyles,
                            parsedFilter: parsedFilter,
                        });
                    } else if (
                        storedState.filter !== fxFilter ||
                        this.stylesChanged(
                            storedState.trackedStyles,
                            currentStyles
                        )
                    ) {
                        this.removeFxContainer(element);
                        this.addFxContainer(element, fxFilter, parsedFilter);
                        this.elements.set(element, {
                            filter: fxFilter,
                            hasContainer: true,
                            trackedStyles: currentStyles,
                            parsedFilter: parsedFilter,
                        });
                    }
                } else {
                    if (storedState && storedState.hasContainer) {
                        this.removeFxContainer(element);
                        this.elements.delete(element);
                    }
                }
            });
    }

    static getFxFilterValue(element) {
        const computed = getComputedStyle(element);
        return computed.getPropertyValue("--fx-filter").trim() || null;
    }

    static addFxContainer(element, filterValue, parsedFilter) {
        if (element.querySelector(".fx-container")) {
            return;
        }

        const { orderedFilters, customFilters } =
            parsedFilter || this.parseFilterValue(filterValue);

        const filterParts = [];
        let svgContent = "";

        orderedFilters.forEach((item) => {
            if (item.type === "custom") {
                const filter = item.filter;
                const callback = this.filters.get(filter.name);

                if (callback) {
                    const filterId = `fx-${filter.name}-${Math.random().toString(36).substr(2, 6)}`;
                    const filterContent = callback(element, ...filter.params);

                    svgContent += `<filter id="${filterId}"
                     x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"
                     >${filterContent}</filter>`;

                    filterParts.push(`url(#${filterId})`);
                }
            } else if (item.type === "css") {
                filterParts.push(item.filter);
            }
        });

        const backdropFilter = filterParts.join(" ");

        if (backdropFilter.trim()) {
            element.innerHTML += `
                <svg style="position: absolute; width: 0; height: 0;">
                    ${svgContent}
                </svg>
                <div class="fx-container" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; backdrop-filter: ${backdropFilter}; background: transparent; pointer-events: none; z-index: -1; overflow: hidden; border-radius: inherit;"></div>
            `;

            this.elements.set(element, {
                filter: filterValue,
                hasContainer: true,
            });
        }
    }

    static createUnifiedSVG(customFilters) {
        // console.log("createUnifiedSVG called with:", customFilters);

        const svg = document.createElement("svg");
        svg.style.cssText =
            "position: absolute; width: 0; height: 0; pointer-events: none;";

        const filterIds = [];
        let svgContent = "";

        customFilters.forEach((filter, index) => {
            // console.log(
            //     "Processing filter:",
            //     filter.name,
            //     "with params:",
            //     filter.params
            // );
            const callback = this.filters.get(filter.name);
            // console.log("Callback found:", !!callback);

            if (callback) {
                // Create unique ID for this filter instance
                const filterId = `fx-${filter.name}-${Math.random().toString(36).substr(2, 6)}`;
                filterIds.push(filterId);

                // Render filter content with callback, passing parameters as arguments
                const filterContent = callback(...filter.params);
                // console.log("Filter content generated:", filterContent);
                svgContent += `<filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">${filterContent}</filter>`;
            }
        });

        // console.log("Final SVG content:", svgContent);
        svg.innerHTML = svgContent;
        // console.log("SVG element created:", svg);
        return { svg, filterIds };
    }

    static removeFxContainer(element) {
        element
            .querySelectorAll(".fx-container, svg")
            .forEach((el) => el.remove());
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

        customFilters.forEach((filter) => {
            const filterOptions = this.filterOptions.get(filter.name);
            if (filterOptions && filterOptions.updatesOn) {
                const computed = getComputedStyle(element);
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

        // Cache results per element and params
        if (!FxFilter._cache) FxFilter._cache = new WeakMap();
        const key = `${width}x${height}-${refractionValue}-${offsetValue}-${chromaticValue}-${borderRadiusStr}`;
        const elemCache = FxFilter._cache.get(element) || {};
        if (elemCache.key === key) return elemCache.result;

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

            // Neutral gray
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 127;
                data[i + 1] = 127;
                data[i + 2] = 127;
                data[i + 3] = 255;
            }

            const half = Math.floor(maxDimension / 2);

            // Top / bottom
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

            // Left / right
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
                const maskCanvas = new OffscreenCanvas(width, height);
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

        FxFilter._cache.set(element, { key, result });
        return result;
    },
    updatesOn: ["border-radius", "width", "height"],
});

FxFilter.init();
