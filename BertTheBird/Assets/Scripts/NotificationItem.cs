using UnityEngine;
using System.Collections;

public class NotificationItem : MonoBehaviour {
	TweenScale t_scale;
	// Use this for initialization
	void Awake () {
		t_scale = GetComponent<TweenScale> ();
	}

	public void Show() {
		NGUITools.SetActive (gameObject, true);
		t_scale.PlayForward();
	}

	public void Hide() {

		t_scale.PlayReverse ();
	}

}
