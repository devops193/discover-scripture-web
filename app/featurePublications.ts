export type PublicationState = 'LIVE' | 'PILOT' | 'PREVIEW';

export type FeaturePublication = {
  featureId: string;
  publicName: string;
  shortStatement: string;
  imageOrDemo: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  productSurface: 'Scripture Discovered' | 'Commander CE' | 'Network and Partners';
  publicationState: PublicationState;
  destination: string;
};

export const featurePublications: readonly FeaturePublication[] = [
  {
    featureId: 'character-worlds',
    publicName: 'Character Worlds',
    shortStatement: 'Enter a person\'s story through profiles, journeys, events, pivotal moments, and Scenes.',
    imageOrDemo: '/platform/gtm/character-world.jpg',
    imageAlt: 'Abraham World in Scripture Discovered, with Profile, Journeys, Events, Pivotal moments, and Scenes.',
    imageWidth: 1320,
    imageHeight: 2868,
    productSurface: 'Scripture Discovered',
    publicationState: 'PILOT',
    destination: '/product-app/',
  },
  {
    featureId: 'scene-story',
    publicName: 'SceneStory',
    shortStatement: 'Move through a Scripture Scene one story frame at a time, with the passage always in reach.',
    imageOrDemo: '/platform/gtm/scene-story.jpg',
    imageAlt: 'SceneStory showing the opening frame of Abraham is tested, with its Genesis 22 citation.',
    imageWidth: 1320,
    imageHeight: 2868,
    productSurface: 'Scripture Discovered',
    publicationState: 'PILOT',
    destination: '/product-app/',
  },
  {
    featureId: 'biblical-lessons',
    publicName: 'Biblical Lessons',
    shortStatement: 'Find compact Scripture-derived lessons, then open the story and its evidence.',
    imageOrDemo: '/platform/gtm/biblical-lessons.jpg',
    imageAlt: 'Biblical Lessons search results for Disobedience, showing lessons from Genesis, First Samuel, and Numbers.',
    imageWidth: 368,
    imageHeight: 800,
    productSurface: 'Scripture Discovered',
    publicationState: 'PREVIEW',
    destination: '/product-app/',
  },
  {
    featureId: 'commander-ce',
    publicName: 'Commander CE',
    shortStatement: 'Run the service, manage the presentation queue, and control the public view.',
    imageOrDemo: '/platform/commander-tablet.jpg',
    imageAlt: 'Commander CE controlling a Sunday Worship Service and its public Scripture presentation.',
    imageWidth: 1600,
    imageHeight: 1110,
    productSurface: 'Commander CE',
    publicationState: 'PILOT',
    destination: '/church-edition',
  },
  {
    featureId: 'smart-presenter',
    publicName: 'Smart Presenter',
    shortStatement: 'Send Scripture and service content to the congregation without exposing private controls.',
    imageOrDemo: '/platform/public-presenter.jpg',
    imageAlt: 'Public Presenter showing Scripture for a Sunday Worship Service.',
    imageWidth: 1600,
    imageHeight: 1200,
    productSurface: 'Commander CE',
    publicationState: 'PILOT',
    destination: '/church-edition',
  },
  {
    featureId: 'network-partners',
    publicName: 'Network and Partners',
    shortStatement: 'Coordinate programs, providers, referrals, and verified ministry activity.',
    imageOrDemo: '/platform/service-program.jpg',
    imageAlt: 'A ministry service program with ordered opening, prayer, and worship blocks.',
    imageWidth: 1600,
    imageHeight: 1200,
    productSurface: 'Network and Partners',
    publicationState: 'PREVIEW',
    destination: '/#network-and-partners',
  },
] as const;

export const publicationsFor = (surface: FeaturePublication['productSurface']) =>
  featurePublications.filter((feature) => feature.productSurface === surface);
