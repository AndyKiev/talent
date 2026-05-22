import {DATE_FORMAT} from "./eNums.ts";


export const formatToUkrDate =
    (dateString: string, format: string = DATE_FORMAT): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());

    return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year);
};