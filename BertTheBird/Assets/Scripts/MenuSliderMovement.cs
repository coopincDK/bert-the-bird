using UnityEngine;
using System.Collections;

public class MenuSliderMovement : MonoBehaviour {
	TweenWidth _tWidth;
	TweenPosition _tPos;
	public int Margin;
	public float Offset;
	public UISprite ShopButton;
	public UISprite AboutButton;
	public UISprite SettingsButton;
	public UISprite LeaderboardsButton;
	public UISprite PlayButton;
	UISprite _target = null;
	UISprite _self;

	void Start() {
		_self = GetComponent<UISprite> ();
		_tWidth = GetComponent<TweenWidth> ();
		_tPos = GetComponent<TweenPosition> ();
		_target = ShopButton; //default
		Invoke ("FastJump", 0.1f);
	}
	
	public void JumpToShop() {
		StopScaleTween ();
		_target = ShopButton;
		Jump (0.5f);
	}

	public void JumpToAbout() {
		StopScaleTween ();
		_target = AboutButton;
		Jump (0.5f);
	}

	public void JumpToSettings() {
		StopScaleTween ();
		_target = SettingsButton;
		Jump (0.5f);
	}

	public void JumpToLeaderboards() {
		StopScaleTween ();
		_target = LeaderboardsButton;
		Jump (0.5f);
	}

	public void JumpToPlay() {
		StopScaleTween ();
		_target = PlayButton;
		Jump (0.5f);
	}

	void Jump(float duration) {
		_tPos.duration = duration;
		_tPos.from.Set(_self.transform.localPosition.x, 0 , 0);
		_tPos.to.Set(_target.transform.localPosition.x + Offset, 0, 0);
		_tWidth.duration = duration;
		_tWidth.from = _self.width;
		_tWidth.to = _target.width + (Margin * 2);

		_tPos.ResetToBeginning ();
		_tWidth.ResetToBeginning ();
		_tPos.PlayForward ();
		_tWidth.PlayForward ();
		StartScaleTween ();
	}

	void FastJump() {
		Jump (0);
	}

	void StopScaleTween() {
		TweenScale scale = _target.GetComponent<TweenScale> ();
		scale.style = UITweener.Style.Once;
		scale.PlayReverse ();
	}

	void StartScaleTween() {
		TweenScale scale = _target.GetComponent<TweenScale> ();
		scale.enabled = true;
		scale.style = UITweener.Style.Once;
		scale.PlayForward ();
	}
}
