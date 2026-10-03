using UnityEngine;
using System.Collections;

public class LightningEffect : MonoBehaviour {


	float _Cooldown = 0f;
	// Use this for initialization
	void OnEnable () {
		StartCoroutine (UpdateEffect ());
	}

	IEnumerator UpdateEffect() {
		SetRandomEffect ();
		yield return new WaitForSeconds(_Cooldown);
		_Cooldown = Random.Range (0.02f, 0.10f);
		StartCoroutine (UpdateEffect ()); 
	}

	void SetRandomEffect() {
		float newWidth = Random.Range (1f, 2.5f);
		float newHeight = Random.Range (1f, 3f);

		if (Random.value > 0.5f) {
			//newWidth = -newWidth;
		}

		transform.localScale = new Vector3 (newWidth, newHeight, 1);
	}

}
