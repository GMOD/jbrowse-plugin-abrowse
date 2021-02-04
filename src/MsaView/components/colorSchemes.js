import Color from "color";
const unnormalizedColorSchemes = {
  clustal: {
    G: "orange",
    P: "orange",
    S: "orange",
    T: "orange",
    H: "red",
    K: "red",
    R: "red",
    F: "blue",
    W: "blue",
    Y: "blue",
    I: "green",
    L: "green",
    M: "green",
    V: "green",
  },
  lesk: {
    G: "orange",
    A: "orange",
    S: "orange",
    T: "orange",
    C: "green",
    V: "green",
    I: "green",
    L: "green",
    P: "green",
    F: "green",
    Y: "green",
    M: "green",
    W: "green",
    N: "magenta",
    Q: "magenta",
    H: "magenta",
    D: "red",
    E: "red",
    K: "blue",
    R: "blue",
  },
  maeditor: {
    A: "lightgreen",
    G: "lightgreen",
    C: "green",
    D: "darkgreen",
    E: "darkgreen",
    N: "darkgreen",
    Q: "darkgreen",
    I: "blue",
    L: "blue",
    M: "blue",
    V: "blue",
    F: "#c8a2c8",
    W: "#c8a2c8",
    Y: "#c8a2c8",
    H: "darkblue",
    K: "orange",
    R: "orange",
    P: "pink",
    S: "red",
    T: "red",
  },
  cinema: {
    H: "blue",
    K: "blue",
    R: "blue",
    D: "red",
    E: "red",
    S: "green",
    T: "green",
    N: "green",
    Q: "green",
    A: "white",
    V: "white",
    L: "white",
    I: "white",
    M: "white",
    F: "magenta",
    W: "magenta",
    Y: "magenta",
    P: "brown",
    G: "brown",
    C: "yellow",
    B: "gray",
    Z: "gray",
    X: "gray",
    "-": "gray",
    ".": "gray",
  },
};

export const colorSchemes = Object.fromEntries(
  Object.entries(unnormalizedColorSchemes).map(([key, val]) => {
    return [
      key,
      Object.fromEntries(
        Object.entries(val).map(([letter, color]) => {
          return [letter, Color(color).hex()];
        }),
      ),
    ];
  }),
);

export const colorContrasts = theme =>
  Object.fromEntries(
    Object.entries(colorSchemes).map(([key, val]) => {
      return [
        key,
        Object.fromEntries(
          Object.entries(val).map(([letter, color]) => {
            return [letter, theme.palette.getContrastText(Color(color).hex())];
          }),
        ),
      ];
    }),
  );
