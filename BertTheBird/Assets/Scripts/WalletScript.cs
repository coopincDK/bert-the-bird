using UnityEngine;
using System.Collections;
using CodeStage.AntiCheat.ObscuredTypes;

public enum Valuta {
	Star,
	Gem
}

public class WalletScript : MonoBehaviour {
	public static WalletScript Wallet = null;
	public WalletLabel StarLabel;
	public WalletLabel GemLabel;
	public ObscuredInt Stars;
	public ObscuredInt Gems;


	void Awake () {
		Game.Wallet = this;
	}

	// Use this for initialization
	void Start () {
		Refresh ();
	}

	public void Refresh() {
		Stars = ObscuredPrefs.GetInt ("Wallet_Stars");
		Gems = ObscuredPrefs.GetInt ("Wallet_Gems");
		StarLabel.Label.text = Format.Number (Stars);
		GemLabel.Label.text = Format.Number (Gems);
	}
	
	public void AddStars(ObscuredInt Amount) {
		AddMoney (Valuta.Star, Amount, 0);
	}

	public void AddGems(ObscuredInt Amount) {
		AddMoney (Valuta.Gem, Amount, 0);
	}

	public void AddStars(ObscuredInt Amount, float delay) {
		AddMoney (Valuta.Star, Amount, delay);
	}
	
	public void AddGems(ObscuredInt Amount, float delay) {
		AddMoney (Valuta.Gem, Amount, delay);
	}

	public void AddMoney(Valuta val, ObscuredInt Amount, float delay) {
		if (Amount > 0) {
			if (val == Valuta.Star) {
				StarLabel.PlayEffect(Amount, delay);
				Stars += Amount;
				ObscuredPrefs.SetInt ("Wallet_Stars", Stars);
				SyncData.Edit.AddCurrency(Amount);
			}
			else if (val == Valuta.Gem) {
				GemLabel.PlayEffect(Amount, delay);
				Gems += Amount;
				ObscuredPrefs.SetInt ("Wallet_Gems", Gems);
				SyncData.Edit.AddPremiumCurrency(Amount);
			}
		}
	}

	public void TakeMoney(Valuta val, ObscuredInt Amount, float delay) {
		Debug.Log ("TAKING MONEY");
		if (Amount > 0) {
			if (val == Valuta.Star) {
				Stars -= Amount;
				StarLabel.GetComponent<UILabel>().text = Format.Number(Stars);
				ObscuredPrefs.SetInt ("Wallet_Stars", Stars);
				SyncData.Edit.AddCurrency(-Amount);
			}
			else if (val == Valuta.Gem) {
				Gems -= Amount;
				GemLabel.GetComponent<UILabel>().text = Format.Number(Gems);
				ObscuredPrefs.SetInt ("Wallet_Gems", Gems);
				SyncData.Edit.AddPremiumCurrency(-Amount);
			}
		}
	}
}
