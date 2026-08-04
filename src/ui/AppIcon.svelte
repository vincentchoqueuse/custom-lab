<script>
  // App icon: LA BALISE DE GR — rectangle blanc sur rectangle rouge, ce qui
  // est peint sur les rochers du sentier côtier pour dire « c'est par ici ».
  // Sauf que la barre blanche est ici un signal, et c'est exactement ce que
  // le nom de l'application raconte : une longue route faite d'étapes
  // courtes et bien balisées.
  //
  // Le MÊME dessin que le favicon d'index.html, au geste près. Ce sont deux
  // fichiers séparés, et ils ont divergé une fois — le favicon changé, ce
  // composant oublié, donc le logo inchangé à l'écran là où l'onglet, lui,
  // avait bougé. Toute retouche se fait des DEUX côtés.
  //
  // Toujours sombre, comme le veut le chrome shadcn ; le liseré discret le
  // garde visible sur la sidebar sombre aussi. Reste lisible jusqu'à 16 px.
  let { size = 24 } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style="flex-shrink: 0">
  <rect x="1" y="1" width="30" height="30" rx="8" fill="#18181b" stroke="#3f3f46" />
  <path
    d="M6 12.5c2.6 0 2.4-5.4 5-5.4s2.4 5.4 5 5.4 2.4-5.4 5-5.4 2.4 5.4 5 5.4"
    fill="none"
    stroke="#fafafa"
    stroke-width="2.6"
    stroke-linecap="round"
  />
  <rect x="6" y="18.5" width="20" height="6" rx="1.4" fill="#C8102E" />
</svg>
