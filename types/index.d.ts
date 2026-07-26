declare const _exports: {
    SQLite: {
        new (path?: string): SQLite;
    };
    str: {
        capitalize(str: string): string;
        titleCase(str: string): string;
        camelCase(str: string): string;
        pascalCase(str: string): string;
        snakeCase(str: string): string;
        kebabCase(str: string): string;
        constantCase(str: string): string;
        slugify(str: string, options?: {
            separator?: string;
            lower?: boolean;
        }): string;
        truncate(str: string, length: number, options?: {
            omission?: string;
            words?: boolean;
        }): string;
        padStart(str: string, length: number, char?: string): string;
        padEnd(str: string, length: number, char?: string): string;
        center(str: string, length: number, char?: string): string;
        reverse(str: string): string;
        squish(str: string): string;
        stripTags(str: string): string;
        escapeHTML(str: string): string;
        unescapeHTML(str: string): string;
        escapeRegExp(str: string): string;
        count(str: string, sub: string): number;
        ensurePrefix(str: string, prefix: string): string;
        ensureSuffix(str: string, suffix: string): string;
        removePrefix(str: string, prefix: string): string;
        removeSuffix(str: string, suffix: string): string;
        template(str: string, data: Record<string, any>, options?: {
            open?: string;
            close?: string;
            fallback?: string;
        }): string;
        words(str: string): string[];
        length(str: string): number;
        random(length?: number, charset?: string): string;
    };
    num: {
        clamp(value: number, min: number, max: number): number;
        inRange(value: number, min: number, max: number): boolean;
        round(value: number, decimals?: number): number;
        floor(value: number, decimals?: number): number;
        ceil(value: number, decimals?: number): number;
        lerp(start: number, end: number, t: number): number;
        mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
        random(min?: number, max?: number): number;
        randomInt(min: number, max: number): number;
        sum(values: number[]): number;
        average(values: number[]): number;
        median(values: number[]): number;
        min(values: number[]): number | undefined;
        max(values: number[]): number | undefined;
        percent(value: number, total: number, decimals?: number): number;
        formatBytes(bytes: number, options?: {
            decimals?: number;
            binary?: boolean;
            iec?: boolean;
        }): string;
        abbreviate(value: number, decimals?: number): string;
        thousands(value: number, separator?: string): string;
        ordinal(value: number): string;
        parse(value: any, fallback?: number): number;
        isEven(value: number): boolean;
        isOdd(value: number): boolean;
        range(start: number, end?: number, step?: number): number[];
    };
    arr: {
        chunk(array: any[], size: number): any[][];
        unique(array: any[], iteratee?: string | ((item: any) => any)): any[];
        groupBy(array: any[], iteratee: string | ((item: any) => any)): Record<string, any[]>;
        keyBy(array: any[], iteratee: string | ((item: any) => any)): Record<string, any>;
        partition(array: any[], predicate: (item: any, index: number) => boolean): [any[], any[]];
        flatten(array: any[], depth?: number): any[];
        shuffle(array: any[]): any[];
        sample(array: any[]): any;
        sampleSize(array: any[], n: number): any[];
        sortBy(array: any[], iteratees: string | ((item: any) => any) | Array<string | ((item: any) => any)>, direction?: "asc" | "desc"): any[];
        difference(array: any[], ...others: any[][]): any[];
        intersection(...arrays: any[][]): any[];
        union(...arrays: any[][]): any[];
        zip(...arrays: any[][]): any[][];
        compact(array: any[]): any[];
        first(array: any[], n?: number): any;
        last(array: any[], n?: number): any;
        remove(array: any[], predicate: (item: any, index: number) => boolean): any[];
        move(array: any[], from: number, to: number): any[];
        countBy(array: any[], iteratee?: string | ((item: any) => any)): Record<string, number>;
        sumBy(array: any[], iteratee?: string | ((item: any) => number)): number;
        maxBy(array: any[], iteratee?: string | ((item: any) => number)): any;
        minBy(array: any[], iteratee?: string | ((item: any) => number)): any;
        times(n: number, value?: any | ((index: number) => any)): any[];
    };
    obj: {
        clone<T>(value: T): T;
        merge(...sources: Record<string, any>[]): Record<string, any>;
        equal(a: any, b: any): boolean;
        get(object: Record<string, any>, path: string | Array<string | number>, fallback?: any): any;
        set(object: Record<string, any>, path: string | Array<string | number>, value: any): Record<string, any>;
        has(object: Record<string, any>, path: string | Array<string | number>): boolean;
        pick(object: Record<string, any>, keys: string[]): Record<string, any>;
        omit(object: Record<string, any>, keys: string[]): Record<string, any>;
        filter(object: Record<string, any>, predicate: (value: any, key: string) => boolean): Record<string, any>;
        mapValues(object: Record<string, any>, fn: (value: any, key: string) => any): Record<string, any>;
        mapKeys(object: Record<string, any>, fn: (key: string, value: any) => string): Record<string, any>;
        invert(object: Record<string, any>): Record<string, string>;
        compact(object: Record<string, any>): Record<string, any>;
        flatten(object: Record<string, any>, prefix?: string): Record<string, any>;
        unflatten(object: Record<string, any>): Record<string, any>;
        isEmpty(object: Record<string, any>): boolean;
        deepFreeze(object: Record<string, any>): Record<string, any>;
    };
    func: {
        debounce<F extends (...args: any[]) => any>(fn: F, wait: number, options?: {
            leading?: boolean;
        }): F & {
            cancel: () => void;
            flush: () => void;
        };
        throttle<F extends (...args: any[]) => any>(fn: F, wait: number, options?: {
            trailing?: boolean;
        }): F & {
            cancel: () => void;
        };
        once<F extends (...args: any[]) => any>(fn: F): F;
        memoize<F extends (...args: any[]) => any>(fn: F, resolver?: (...args: any[]) => any): F & {
            cache: Map<any, any>;
        };
        retry<T>(fn: () => T | Promise<T>, options?: {
            attempts?: number;
            delay?: number;
            backoff?: number;
            maxDelay?: number;
            shouldRetry?: (error: unknown, attempt: number) => boolean;
            onRetry?: (error: unknown, attempt: number) => void;
        }): Promise<T>;
        timeout<T>(promise: Promise<T> | (() => Promise<T>), ms: number, message?: string): Promise<T>;
        pipe(...fns: ((arg: any) => any)[]): (...args: any[]) => any;
        compose(...fns: ((arg: any) => any)[]): (...args: any[]) => any;
        curry(fn: (...args: any[]) => any, arity?: number): (...args: any[]) => any;
        negate(predicate: (...args: any[]) => boolean): (...args: any[]) => boolean;
        after<F extends (...args: any[]) => any>(n: number, fn: F): F;
        promisify(fn: (...args: any[]) => void): (...args: any[]) => Promise<any>;
        attempt<T>(fn: (...args: any[]) => Promise<T> | T): (...args: any[]) => Promise<[unknown, T | undefined]>;
    };
    time: {
        setLocale(locale: string): TimeModule;
        setTimezone(timeZone: string | undefined): TimeModule;
        getConfig(): {
            locale: string;
            timeZone: string | undefined;
        };
        parseDuration(input: string | number): number | null;
        formatDuration(ms: number, options?: {
            long?: boolean;
            units?: number;
            locale?: string;
        }): string;
        relative(date: Date | number | string, from?: Date | number | string, options?: {
            locale?: string;
            numeric?: "always" | "auto";
        }): string;
        format(date: Date | number | string, pattern?: string, options?: {
            locale?: string;
            timeZone?: string;
        }): string;
        add(date: Date | number | string, amount: number | string, unit?: "ms" | "s" | "m" | "h" | "d" | "w"): Date;
        subtract(date: Date | number | string, amount: number | string, unit?: "ms" | "s" | "m" | "h" | "d" | "w"): Date;
        diff(a: Date | number | string, b: Date | number | string, unit?: "ms" | "s" | "m" | "h" | "d" | "w"): number;
        isSameDay(a: Date | number | string, b: Date | number | string, options?: {
            timeZone?: string;
        }): boolean;
        startOf(date: Date | number | string, unit: "year" | "month" | "day" | "hour" | "minute" | "second"): Date;
        unix(): number;
        stopwatch(): {
            elapsed: () => number;
            stop: (format?: boolean) => number | string;
        };
    };
    id: {
        uuid(): string;
        nano(size?: number, alphabet?: string): string;
        ulid(time?: number): string;
        token(bytes?: number, encoding?: "hex" | "base64" | "base64url" | "base58"): string;
        code(length?: number, alphabet?: string): string;
        hash(value: string | Buffer, options?: {
            algorithm?: string;
            encoding?: "hex" | "base64" | "base64url";
        }): string;
        hmac(value: string | Buffer, secret: string | Buffer, options?: {
            algorithm?: string;
            encoding?: "hex" | "base64" | "base64url";
        }): string;
        safeEqual(a: string | Buffer, b: string | Buffer): boolean;
        seq(prefix?: string): string;
    };
    logger: {
        setTimestamp(value: boolean): Logger;
        setDelimiter(options?: {
            open?: string | undefined;
            close?: string | undefined;
        }): Logger;
        log(content: any): Logger;
        info(content: any): Logger;
        success(content: any): Logger;
        warn(content: any): Logger;
        error(content: any): Logger;
        debug(content: any): Logger;
        group(label: string): Logger;
        groupEnd(): Logger;
    };
    fs: {
        getEnv(value: string, envFilePath?: string): string | undefined;
        createPath(path?: string): string;
        getFoldersIn(path?: string, recursive?: boolean): string[] | undefined;
        getFolder(path?: string): string | undefined;
        getFilesIn(path?: string, recursive?: boolean): string[] | undefined;
        getFile(path: string): string | undefined;
        createFolder(path: string, force?: boolean): boolean | undefined;
        createFile(path: string, force?: boolean, data?: string | object | null | undefined): boolean | undefined;
        deleteFoldersIn(path?: string, filter?: (folder: string) => boolean): number | undefined;
        deleteFolder(path: string): boolean | undefined;
        deleteFilesIn(path?: string, recursive?: boolean, filter?: (file: string) => boolean): number | undefined;
        deleteFile(path: string): boolean | undefined;
        copyFoldersIn(options: {
            dest: string;
            path?: string | undefined;
            recursive?: boolean | undefined;
            withFiles?: boolean | undefined;
            force?: boolean | undefined;
            filter?: ((folder: string) => boolean) | undefined;
        }): number | undefined;
        copyFolder(options: {
            dest: string;
            path?: string | undefined;
            recursive?: boolean | undefined;
            withFiles?: boolean | undefined;
            force?: boolean | undefined;
        }): boolean | undefined;
        copyFilesIn(options: {
            dest: string;
            path?: string | undefined;
            recursive?: boolean | undefined;
            force?: boolean | undefined;
            filter?: ((file: string) => boolean) | undefined;
        }): number | undefined;
        copyFile(options: {
            path: string;
            dest: string;
            force?: boolean | undefined;
        }): boolean | undefined;
        moveFoldersIn(options: {
            dest: string;
            path?: string | undefined;
            recursive?: boolean | undefined;
            withFiles?: boolean | undefined;
            force?: boolean | undefined;
            filter?: ((folder: string) => boolean) | undefined;
        }): number | undefined;
        moveFolder(options: {
            path: string;
            dest: string;
            recursive?: boolean | undefined;
            withFiles?: boolean | undefined;
            force?: boolean | undefined;
        }): boolean | undefined;
        moveFilesIn(options: {
            dest: string;
            path?: string | undefined;
            recursive?: boolean | undefined;
            force?: boolean | undefined;
            filter?: ((file: string) => boolean) | undefined;
        }): number | undefined;
        moveFile(options: {
            path: string;
            dest: string;
            force?: boolean | undefined;
        }): boolean | undefined;
        readFile(path: string): string | undefined;
        readJSON<T>(path: string, fallback?: T): T | any | undefined;
        writeJSON(path: string, data: any, options?: {
            spaces?: number;
            force?: boolean;
        }): boolean;
        appendFile(path: string, data: string): boolean;
        exists(path: string): boolean;
        stat(path: string): any | undefined;
        fileSize(path: string): number | undefined;
        hashFile(path: string, options?: {
            algorithm?: string;
            encoding?: "hex" | "base64" | "base64url";
        }): string | undefined;
        emptyFolder(path: string): boolean | undefined;
        watch(options?: {
            path?: string | undefined;
            recursive?: boolean | undefined;
            filter?: ((event: "rename" | "change", file: string) => boolean) | undefined;
        }): {
            on: <E extends "change" | "rename" | "all">(event: E, callback: E extends "all" ? (event: "change" | "rename", file: string) => void | Promise<void> : (file: string) => void | Promise<void>) => any;
            stop: () => void;
            pause: () => any;
            resume: () => any;
        } | undefined;
    };
    checker: {
        isArray(value: any): boolean;
        isNumber(value: any): boolean;
        isFinite(value: any): boolean;
        isInteger(value: any): boolean;
        isFloat(value: any): boolean;
        isFunction(value: any): boolean;
        isAsyncFunction(value: any): boolean;
        isObject(value: any): boolean;
        isPlainObject(value: any): boolean;
        isBoolean(value: any): boolean;
        isString(value: any): boolean;
        isSymbol(value: any): boolean;
        isBigInt(value: any): boolean;
        isUndefined(value: any): boolean;
        isNull(value: any): boolean;
        isNil(value: any): boolean;
        isPrimitive(value: any): boolean;
        isPromise(value: any): boolean;
        isRegExp(value: any): boolean;
        isDate(value: any): boolean;
        isValidDate(value: any): boolean;
        isMap(value: any): boolean;
        isSet(value: any): boolean;
        isWeakMap(value: any): boolean;
        isWeakSet(value: any): boolean;
        isIterable(value: any): boolean;
        isBuffer(value: any): boolean;
        isTypedArray(value: any): boolean;
        isError(value: any): boolean;
        isEmpty(value: any): boolean;
        isEmail(value: any): boolean;
        isURL(value: any, options?: {
            protocols?: string[];
        }): boolean;
        isUUID(value: any): boolean;
        isJSON(value: any): boolean;
        isNumeric(value: any): boolean;
    };
    utils: {
        wait(ms: number): Promise<void>;
        when(predicate: boolean | Promise<boolean> | (() => boolean | Promise<boolean>), payload?: any, options?: {
            interval?: number | undefined;
            timeout?: number | null | undefined;
            max?: number | null | undefined;
        }): {
            start: () => any;
            stop: () => any;
            on: <E extends "error" | "trigger" | "timeout">(event: E, handler: E extends "error" ? (error: unknown) => void | Promise<void> : (payload: any) => void | Promise<void>) => any;
        };
        dontCrash(): {
            on: <E extends "error" | "exit" | "sig" | "beforeExit">(event: E, handler?: (E extends "error" ? (error: Error | unknown) => void | Promise<void> : E extends "exit" ? (code: number) => void | Promise<void> : E extends "sig" ? (signal: "SIGINT" | "SIGTERM" | "SIGQUIT") => void | Promise<void> : (code: number) => void | Promise<void>)) => any;
        };
        JSONString(value: any): string;
        JSONParse(value: string): any;
    };
    wait(ms: number): Promise<void>;
    when(predicate: boolean | Promise<boolean> | (() => boolean | Promise<boolean>), payload?: any, options?: {
        interval?: number | undefined;
        timeout?: number | null | undefined;
        max?: number | null | undefined;
    }): {
        start: () => any;
        stop: () => any;
        on: <E extends "error" | "trigger" | "timeout">(event: E, handler: E extends "error" ? (error: unknown) => void | Promise<void> : (payload: any) => void | Promise<void>) => any;
    };
    dontCrash(): {
        on: <E extends "error" | "exit" | "sig" | "beforeExit">(event: E, handler?: (E extends "error" ? (error: Error | unknown) => void | Promise<void> : E extends "exit" ? (code: number) => void | Promise<void> : E extends "sig" ? (signal: "SIGINT" | "SIGTERM" | "SIGQUIT") => void | Promise<void> : (code: number) => void | Promise<void>)) => any;
    };
    JSONString(value: any): string;
    JSONParse(value: string): any;
    isArray(value: any): boolean;
    isNumber(value: any): boolean;
    isFinite(value: any): boolean;
    isInteger(value: any): boolean;
    isFloat(value: any): boolean;
    isFunction(value: any): boolean;
    isAsyncFunction(value: any): boolean;
    isObject(value: any): boolean;
    isPlainObject(value: any): boolean;
    isBoolean(value: any): boolean;
    isString(value: any): boolean;
    isSymbol(value: any): boolean;
    isBigInt(value: any): boolean;
    isUndefined(value: any): boolean;
    isNull(value: any): boolean;
    isNil(value: any): boolean;
    isPrimitive(value: any): boolean;
    isPromise(value: any): boolean;
    isRegExp(value: any): boolean;
    isDate(value: any): boolean;
    isValidDate(value: any): boolean;
    isMap(value: any): boolean;
    isSet(value: any): boolean;
    isWeakMap(value: any): boolean;
    isWeakSet(value: any): boolean;
    isIterable(value: any): boolean;
    isBuffer(value: any): boolean;
    isTypedArray(value: any): boolean;
    isError(value: any): boolean;
    isEmpty(value: any): boolean;
    isEmail(value: any): boolean;
    isURL(value: any, options?: {
        protocols?: string[];
    }): boolean;
    isUUID(value: any): boolean;
    isJSON(value: any): boolean;
    isNumeric(value: any): boolean;
    getEnv(value: string, envFilePath?: string): string | undefined;
    createPath(path?: string): string;
    getFoldersIn(path?: string, recursive?: boolean): string[] | undefined;
    getFolder(path?: string): string | undefined;
    getFilesIn(path?: string, recursive?: boolean): string[] | undefined;
    getFile(path: string): string | undefined;
    createFolder(path: string, force?: boolean): boolean | undefined;
    createFile(path: string, force?: boolean, data?: string | object | null | undefined): boolean | undefined;
    deleteFoldersIn(path?: string, filter?: (folder: string) => boolean): number | undefined;
    deleteFolder(path: string): boolean | undefined;
    deleteFilesIn(path?: string, recursive?: boolean, filter?: (file: string) => boolean): number | undefined;
    deleteFile(path: string): boolean | undefined;
    copyFoldersIn(options: {
        dest: string;
        path?: string | undefined;
        recursive?: boolean | undefined;
        withFiles?: boolean | undefined;
        force?: boolean | undefined;
        filter?: ((folder: string) => boolean) | undefined;
    }): number | undefined;
    copyFolder(options: {
        dest: string;
        path?: string | undefined;
        recursive?: boolean | undefined;
        withFiles?: boolean | undefined;
        force?: boolean | undefined;
    }): boolean | undefined;
    copyFilesIn(options: {
        dest: string;
        path?: string | undefined;
        recursive?: boolean | undefined;
        force?: boolean | undefined;
        filter?: ((file: string) => boolean) | undefined;
    }): number | undefined;
    copyFile(options: {
        path: string;
        dest: string;
        force?: boolean | undefined;
    }): boolean | undefined;
    moveFoldersIn(options: {
        dest: string;
        path?: string | undefined;
        recursive?: boolean | undefined;
        withFiles?: boolean | undefined;
        force?: boolean | undefined;
        filter?: ((folder: string) => boolean) | undefined;
    }): number | undefined;
    moveFolder(options: {
        path: string;
        dest: string;
        recursive?: boolean | undefined;
        withFiles?: boolean | undefined;
        force?: boolean | undefined;
    }): boolean | undefined;
    moveFilesIn(options: {
        dest: string;
        path?: string | undefined;
        recursive?: boolean | undefined;
        force?: boolean | undefined;
        filter?: ((file: string) => boolean) | undefined;
    }): number | undefined;
    moveFile(options: {
        path: string;
        dest: string;
        force?: boolean | undefined;
    }): boolean | undefined;
    readFile(path: string): string | undefined;
    readJSON<T>(path: string, fallback?: T): T | any | undefined;
    writeJSON(path: string, data: any, options?: {
        spaces?: number;
        force?: boolean;
    }): boolean;
    appendFile(path: string, data: string): boolean;
    exists(path: string): boolean;
    stat(path: string): any | undefined;
    fileSize(path: string): number | undefined;
    hashFile(path: string, options?: {
        algorithm?: string;
        encoding?: "hex" | "base64" | "base64url";
    }): string | undefined;
    emptyFolder(path: string): boolean | undefined;
    watch(options?: {
        path?: string | undefined;
        recursive?: boolean | undefined;
        filter?: ((event: "rename" | "change", file: string) => boolean) | undefined;
    }): {
        on: <E extends "change" | "rename" | "all">(event: E, callback: E extends "all" ? (event: "change" | "rename", file: string) => void | Promise<void> : (file: string) => void | Promise<void>) => any;
        stop: () => void;
        pause: () => any;
        resume: () => any;
    } | undefined;
    setTimestamp(value: boolean): Logger;
    setDelimiter(options?: {
        open?: string | undefined;
        close?: string | undefined;
    }): Logger;
    log(content: any): Logger;
    info(content: any): Logger;
    success(content: any): Logger;
    warn(content: any): Logger;
    error(content: any): Logger;
    debug(content: any): Logger;
    group(label: string): Logger;
    groupEnd(): Logger;
};
export = _exports;
import SQLite = require("./src/SQLite");
import time = require("./src/Time");
//# sourceMappingURL=index.d.ts.map
