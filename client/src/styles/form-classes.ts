// Consistent styling classes
export const inputClasses = `
mt-1 block w-full rounded-md border px-3 py-2 text-sm min-h-10 pointer-coarse:min-h-11
border-[#e5e3dc] dark:border-white/12 hover:border-[#cfcdc5] dark:hover:border-white/25
bg-white dark:bg-[#0b0b0c]
text-[#111110] dark:text-[#f4f4f2]
placeholder:text-[#6f6e69] dark:placeholder:text-[#8f8e88]
focus-visible:outline-none focus-visible:border-[#111110] dark:focus-visible:border-[#f4f4f2]
focus-visible:ring-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]
focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c]
transition-colors duration-150
`;

export const labelClasses = `
block text-[12.5px] font-medium mb-1.5 ml-1
text-[#5c5b56] dark:text-[#a3a29c]
`;

export const sectionDivClasses = `
border-b border-[#e5e3dc] dark:border-white/12
`;

export const sectionHeaderClasses = `
text-lg font-semibold pb-2
text-[#111110] dark:text-[#f4f4f2]
`;

export const buttonClasses = `
inline-flex items-center justify-center px-3 py-2 border text-sm
leading-4 font-medium rounded-md min-h-9 pointer-coarse:min-h-11
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]
focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c]
transition-colors duration-150
`;

export const addButtonClasses = `
${buttonClasses}
bg-white dark:bg-transparent text-[#111110] dark:text-[#f4f4f2]
border-[#cfcdc5] dark:border-white/25
hover:bg-[#f6f5f2] dark:hover:bg-[#151517] mb-1.5
`;

export const removeButtonClasses = `
${buttonClasses}
bg-transparent border-transparent text-[#b3261e] dark:text-[#ff8a80]
hover:bg-[#b3261e]/10 dark:hover:bg-[#ff8a80]/15
`;

export const cardClasses = `
p-4 border rounded-lg space-y-4
border-[#e5e3dc] dark:border-white/12 hover:border-[#cfcdc5] dark:hover:border-white/25
bg-[#f6f5f2] dark:bg-[#151517] transition-colors duration-150
`;