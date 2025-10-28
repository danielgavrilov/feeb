export interface RestaurantProgress {
  name: string;
  menuUploaded: boolean;
  ingredientsConfirmed: boolean;
  customisationDone: boolean;
}

export const mockRestaurant: RestaurantProgress = {
  name: "Sunset Bistro",
  menuUploaded: false,
  ingredientsConfirmed: false,
  customisationDone: false,
};
