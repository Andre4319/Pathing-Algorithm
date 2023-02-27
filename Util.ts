/**
 * Compares two objects
 * @param first object
 * @param second object
 * @returns if the first and second are equal, not a deep check!
 */
export function equals<T>(first: T, second: T): boolean {
    const keys = Object.keys(first) as Array<keyof T>;
    return keys.every(key => first[key] == second[key]);
}

/**
 * Limits a value to a minimum value and a maximum value
 * @param value To compare
 * @param min Value can't be less this value
 * @param max Value can't exceed this value
 * @returns The value or min/max
 */
export function limit(value: number, min: number, max: number): number {
    if (value < min) {
        return min;
    } else if (value > max) {
        return max;
    } else {
        return value;
    }
}
