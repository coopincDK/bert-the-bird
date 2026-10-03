using UnityEngine;
using System.Collections;
using CodeStage.AntiCheat.ObscuredTypes;

public class ShopItemScript : MonoBehaviour {
	UILabel Item_Description;
	Transform PriceContainer;
	Transform CheckBox;
	Transform StaticCheck;
	UILabel PriceLabel;
	UIToggle cb;
	TweenPosition tp;
	public Valuta Currency;
	public int ID = 0;
	public int Price = 300;
	public int MaxAmount;
	public bool Unlocked = false;
	public bool RadioButton;
	public bool PlayerSkin;
	public bool Upgradeable;

	[HideInInspector]
	public int currentAmount = 0;

	// Use this for initialization
	void Start () {
		Transform Container = transform.FindChild("RightContainer");
		Transform TextContainer = transform.FindChild ("TextArea");
		Item_Description = TextContainer.FindChild ("Item_Description").GetComponent<UILabel> ();
		PriceContainer = Container.FindChild ("_PriceContainer");
		CheckBox = Container.FindChild ("_CheckBox");
		StaticCheck = Container.FindChild ("_StaticCheck");
		PriceLabel = (UILabel)PriceContainer.FindChild ("PriceLabel").GetComponent<UILabel>();
		PriceLabel.text = Price.ToString();
		cb = CheckBox.GetComponent<UIToggle>();
		tp = PriceContainer.GetComponent<TweenPosition> ();
		Refresh ();
	}

	void SetLevelDescription() {
		Item_Description.text = "Level " + (currentAmount + 1);
		if (currentAmount < MaxAmount) {
			Item_Description.text += " (max " + (MaxAmount + 1) + ")";
		} else {
			Item_Description.text += " (max)";
		}
	}


	public void Refresh() {
		Unlocked = ObscuredPrefs.GetBool ("Item_" + ID.ToString () + "_Unlocked") || ID == 0;
		currentAmount = ObscuredPrefs.GetInt ("Item_" + ID.ToString() + "_Count");
		if (currentAmount > MaxAmount) currentAmount = MaxAmount;

		if (PlayerSkin) {
			cb.group = 1;
			if (ID == ObscuredPrefs.GetInt("Current_PlayerSkin"))
				cb.value = true;
			else
				cb.value = false;
		}

		if (Upgradeable) {
			SetLevelDescription();
		}

		if ((Unlocked && !Upgradeable) || (Upgradeable && currentAmount >= MaxAmount)) {
			if (RadioButton) {
				NGUITools.SetActive(PriceContainer.gameObject, false);
				NGUITools.SetActive(CheckBox.gameObject, true);
				NGUITools.SetActive(StaticCheck.gameObject, false);
			} 
			else {
				NGUITools.SetActive(PriceContainer.gameObject, false);
				NGUITools.SetActive(CheckBox.gameObject, false);
				NGUITools.SetActive(StaticCheck.gameObject, true);			
			}
		} 
		else {
			NGUITools.SetActive(PriceContainer.gameObject, true);
			tp.ResetToBeginning ();
			NGUITools.SetActive(CheckBox.gameObject, false);
			NGUITools.SetActive(StaticCheck.gameObject, false);
		}
	}


	public void Buy() {
		// Checks for available money
		int AvailableMoney = 0;
		if (Currency == Valuta.Gem)
			AvailableMoney = Game.Wallet.Gems;
		if (Currency == Valuta.Star)
			AvailableMoney = Game.Wallet.Stars;


		if (AvailableMoney < Price) {
			NotificationScript.instance.OpenGemShop();
		} 
		else {
			PreformPurchase();
		}
	}


	void PreformPurchase() {
		currentAmount++;
		Game.Wallet.TakeMoney (Currency, Price, 0.5f);
		SyncData.Edit.AddItemBourght (ID);
		Unlocked = true;
		ObscuredPrefs.SetBool ("Item_" + ID.ToString () + "_Unlocked", true);
		ObscuredPrefs.SetInt ("Item_" + ID.ToString() + "_Count", currentAmount);
		if (PlayerSkin) {
			ObscuredPrefs.SetInt ("Current_PlayerSkin", ID);
			cb.value = true;
		}



		if (Upgradeable && currentAmount <= MaxAmount) {
			SetLevelDescription();
		}

		if (!Upgradeable || (Upgradeable && currentAmount >= MaxAmount)) {
			tp.PlayForward ();
			Invoke ("ShowCheckBox", 0.8f);
		} 

	}

	void ShowCheckBox() {
		Transform target = null;
		NGUITools.SetActive(PriceContainer.gameObject, false);
		if (RadioButton)
			target = CheckBox;
		else
			target = StaticCheck;


		NGUITools.SetActive(target.gameObject, true);
		TweenScale ts = target.GetComponent<TweenScale> ();
		Statics.Sounds.Pop.PlayOneShot ();
		ts.PlayForward ();
	}


	public void CheckBoxAction() {
		if (Unlocked && PlayerSkin) {
			Statics.Sounds.Pop.PlayOneShot();
			ObscuredPrefs.SetInt ("Current_PlayerSkin", ID);
			cb.value = true;
		}
	}


}
