using UnityEngine;
using System.Collections;



public class NotificationScript : MonoBehaviour {

	public static NotificationScript instance;
	public Transform BG;

	public GameObject[] Notifications;
	//SHOP NOTIFICATIONS
	//00 - GemShop
	//01 - StarShop
	//02 - FreeGems

	//SOCIAL NOTIFICATIONS
	//....
	
	GameObject CurrentNotification;


	// Use this for initialization
	void Awake () {
		instance = this;
		gameObject.SetActive (false);
	}

	public void Close() {
		CurrentNotification.GetComponent<NotificationItem>().Hide();
		BG.GetComponent<TweenAlpha> ().onFinished.Add(new EventDelegate(this, "InActivate"));
		BG.GetComponent<TweenAlpha>().PlayReverse();

	}

	public void InActivate() {
		gameObject.SetActive (false);
	}

	public void ShowNotification(int Index) {
		BG.GetComponent<TweenAlpha> ().onFinished.Clear();
		if (CurrentNotification != null) {
			NGUITools.SetActive(CurrentNotification, false);
			BG.GetComponent<TweenAlpha>().PlayForward();
			CurrentNotification = null;
		}
		GameObject NewNotification = Notifications [Index];
		if (NewNotification != null) {
			CurrentNotification = NewNotification;
			NGUITools.SetActive(gameObject, true);
			CurrentNotification.GetComponent<NotificationItem>().Show();
		}
	}

	public void OpenGemShop() {
		ShowNotification (0);
	}

	public void OpenStarShop() {
		ShowNotification (1);
	}

	public void OpenFreeGems() {
		ShowNotification (2);
	}


}
