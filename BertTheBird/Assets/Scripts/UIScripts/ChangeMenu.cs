using UnityEngine;

public class ChangeMenu : MonoBehaviour {
	public MenuPage ShowMenu;
	public bool ShowMainMenu = false;
	void OnPress (bool pressed) {
			if (ShowMenu != null && pressed) {
			if (Statics.CurrentMenuPage != ShowMenu)
				ShowMenu.Show ();
			else
				ShowMenu.Show();

			if (ShowMainMenu)
					Level.Control.ShowMainMenu();
			}
	}
}
