
/**
 * It takes two objects of the same type, and returns true if they have the same properties and values
 * @param {T} first - T
 * @param {T} second - T
 * @returns A function that takes two arguments and returns a boolean.
 */
export function equals<T>(first: T, second: T): boolean {
    const keys = Object.keys(first) as Array<keyof T>;
    return keys.every(key => first[key] == second[key]);
}


/**
 * If the value is less than the minimum, return the minimum; if the value is greater than the maximum,
 * return the maximum; otherwise, return the value.
 * @param {number} value - The value to limit.
 * @param {number} min - The minimum value the returned value can be.
 * @param {number} max - The maximum value the returned value can be.
 * @returns The value of the variable "value" is being returned.
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
