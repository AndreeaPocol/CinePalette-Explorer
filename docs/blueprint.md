# **App Name**: CinePalette Explorer

## Core Features:

- Movie ID Selection: Allow the user to select a movie ID from a dropdown list of available movie IDs.
- YouTube Video Display: Display the YouTube video associated with the selected movie ID, using the URL structure `https://www.imdb.com/title/{ID}/`.
- Color Palette Explanation: Display the color palette image (named '{ID}.png') corresponding to the selected movie. Use a tool to provide brief explanations for why each color is present in the palette, referencing the movie's scenes or themes.

## Style Guidelines:

- Primary color: Dark background (#121212) to emphasize the video and color palettes.
- Secondary color: Light gray (#E0E0E0) for text and interactive elements to ensure readability.
- Accent: Teal (#008080) to highlight the active movie selection and interactive buttons.
- Clean and modern font for readability.
- Use a clear, sectioned layout, with the video at the top, the color palette below, and explanations underneath. Ensure the layout is responsive for different screen sizes.
- Simple, flat icons for interactive elements like the dropdown and any call-to-action buttons.

## Original User Request:
the app accepts a movie ID from the isuer. this will be selected from a dropdown.  

it displays the youtube video for the movie, which is the video found at "https://www.imdb.com/title/{ID}/".

it then displays the corresponding color palette for the movie, named "{ID}.png. I will upload these palettes. the list of palettes should populate the dropdown of movies the user can select from.

for each color in the color palette, it will offer an explanation for why that color is in the palette (i.e., how it features in the movie).
  