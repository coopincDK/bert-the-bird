using UnityEngine;
using System.Collections;
using CodeStage.AntiCheat.ObscuredTypes;

public class SocialButton : MonoBehaviour {
	public bool StartEnabled = false;
	public bool Mute = true;
	public bool Facebook = false;
	public bool Twitter = false;
	public float NotifyFrom = 10f;
	public float NotifyTo = 30f;
	AudioSource Notification;
	AudioSource Pop;
	TweenRotation Shake;
	TweenScale Scale;
	TweenPosition Pos;
	bool Visible = false;
	GameObject SocialGo;
	FacebookScript fb;
	TwitterScript tw;
	bool permMute = false;
	UISprite sprite;
	UIButton button;
	Animator anim;
	bool WasClicked = false;

	private bool TweetedToday() {
		return ObscuredPrefs.GetString ("Social_Twitter_PostDate") == System.DateTime.Now.ToString ("dd-MM-yyyy");
	}

	private bool SharedToday() {
		return ObscuredPrefs.GetString ("Social_Facebook_PostDate") == System.DateTime.Now.ToString ("dd-MM-yyyy");
	}

	// Use this for initialization
	void Start () {
		SocialGo = GameObject.Find ("SocialScriptContainer");
		fb = SocialGo.GetComponent<FacebookScript> ();
		tw = SocialGo.GetComponent<TwitterScript> ();

		sprite = GetComponent<UISprite>();
		button = GetComponent<UIButton> ();
		anim = GetComponent<Animator> ();

		Notification = GetComponents<AudioSource> ()[0];
		if (GetComponents<AudioSource> ().Length > 1) {
			Pop = GetComponents<AudioSource> ()[1];
		}
		Shake = GetComponent<TweenRotation> ();
		Scale = GetComponent<TweenScale> ();
		Pos = transform.parent.GetComponent<TweenPosition> ();

		if (!StartEnabled) {
			NGUITools.SetActive (gameObject, false);
		} else {
			Play ();
		}

		UpdateButtonState ();
	}

	public void UpdateButtonState() {
		if ((Twitter && TweetedToday())  || (Facebook && SharedToday())) {
			permMute = true;
			SetNormalTexture();
		} 
	}

	public void DoPostAction(bool Success) {
		if (!permMute && WasClicked && Success) {
			Invoke ("AnimationPop", 0.5f);
			if (anim != null) {
				anim.SetTrigger("PlayPostAnimation");
			}
			permMute = true;
		} 
		else {
			UpdateButtonState();
		}
		WasClicked = false;
	}

	void AnimationPop() {
		SetNormalTexture ();
		if (Pop != null) 
			Pop.Play ();
	}

	void SetNormalTexture() {
		if (Twitter) {
			sprite.spriteName = "twitter_small"; //Without Bonus
			button.normalSprite = "twitter_small";
		}
		else if (Facebook) {
			sprite.spriteName = "facebook_small"; //Without Bonus
			button.normalSprite = "facebook_small";
		}
	}



	void OnClick () {
		WasClicked = true;

		if (Facebook) {
			fb.PostHighScore(SharedToday() ? 0 : 1000);
		} 
		else if (Twitter) {
			tw.PostHighScore(TweetedToday() ? 0 : 1000);
		}
	}
	

	public void Show() {
		Visible = true;
		NGUITools.SetActive (gameObject, true);
		//Pos.ResetToBeginning ();
		Pos.PlayForward ();
		Play ();
	}

	public void Hide() {
		Visible = false;
		//Pos.ResetToBeginning ();
		Pos.PlayReverse ();
		Stop ();

	}

	public void Disable() {
		if (!Visible) {
			NGUITools.SetActive (gameObject, false);
		}
	}


	
	public void Notify() {
		if (!Mute && !permMute) {
			Shake.ResetToBeginning();
			Shake.PlayForward();
			Scale.ResetToBeginning();
			Scale.PlayForward();
			Notification.Play();
			Invoke ("Notify", Random.Range(NotifyFrom, NotifyTo));
		}
	}

	public void Play() {
		Mute = false;
		UpdateButtonState();
	}

	void OnEnable() {
		Invoke ("Notify", Random.Range(NotifyFrom, NotifyTo));
	}

	void OnDisable() {
		CancelInvoke ("Notify");
	}

	public void Stop() {
		CancelInvoke();
		Mute = true;
	}
}
