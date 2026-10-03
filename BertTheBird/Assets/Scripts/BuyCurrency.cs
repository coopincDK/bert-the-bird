using UnityEngine;
using System.Collections;

public class BuyCurrency : MonoBehaviour {
	public Valuta Type;
	public int Amount;

	public Valuta PriceType;
	public int PriceAmount;


	void OnPress(bool Clicked) {
		if (!Clicked) {
			if (PriceAmount > 0) {
				if ((PriceType == Valuta.Gem && Game.Wallet.Gems >= PriceAmount) || (PriceType == Valuta.Star && Game.Wallet.Stars >= PriceAmount)) {
					Game.Wallet.TakeMoney(PriceType, PriceAmount, 0);
				} else {
					if (PriceType == Valuta.Gem)
						NotificationScript.instance.OpenGemShop();
					else if (PriceType == Valuta.Star)
						NotificationScript.instance.OpenStarShop();
					return;
				}
			}
			Game.Wallet.AddMoney(Type, Amount, 0);
			NotificationScript.instance.Close();

		}
	}
}
