// Consistent styling classes
export const inputClasses = `
mt-1 block w-full rounded-md border shadow-sm px-3 py-2
border-gray-300 dark:border-gray-600 
bg-white dark:bg-gray-700 
text-gray-900 dark:text-white
placeholder-gray-500 dark:placeholder-gray-400
focus:border-indigo-500 focus:ring-indigo-500 focus:ring-1
transition-colors duration-200
`;

export const labelClasses = `
block text-sm font-medium mb-1.5 ml-1
text-gray-700 dark:text-gray-300
`;

export const sectionDivClasses = `
border-b-1 border-gray-200 dark:border-gray-700
`;

export const sectionHeaderClasses = `
text-xl font-semibold pb-2
text-gray-900 dark:text-white
`;

export const buttonClasses = `
inline-flex items-center px-3 py-2 border border-transparent text-sm 
leading-4 font-medium rounded-md focus:outline-none focus:ring-2 
focus:ring-offset-2 transition-colors duration-200
`;

export const addButtonClasses = `
${buttonClasses}
text-indigo-700 bg-indigo-100 hover:bg-indigo-200 
focus:ring-indigo-500 dark:bg-indigo-900 dark:text-indigo-200 
dark:hover:bg-indigo-800 dark:focus:ring-offset-gray-800 mb-1.5
`;

export const removeButtonClasses = `
${buttonClasses}
text-red-700 bg-red-100 hover:bg-red-200 
focus:ring-red-500 dark:bg-red-900 dark:text-red-200 
dark:hover:bg-red-800 dark:focus:ring-offset-gray-800
`;

export const cardClasses = `
p-4 border rounded-lg space-y-4
border-gray-200 dark:border-gray-700
bg-gray-50 dark:bg-gray-800
`;