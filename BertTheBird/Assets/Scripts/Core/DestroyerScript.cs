using UnityEngine;
using System.Collections;

public class DestroyerScript : MonoBehaviour {

	void OnTriggerEnter2D (Collider2D other) {
		Cleanup (other.transform);



		//if(other.gameObject.transform.parent) {
		//	if (other.transform.parent.GetComponent<PropSettings>() != null)
		//	LevelPool.destroy(other.gameObject.transform.parent.gameObject);
		//} else {
		//	if (other.GetComponent<PropSettings>() != null)
		//	
		//}
	}

	void Cleanup(Transform trans) {
		if (trans.tag == "PoolObject") {
			LevelPool.destroy(trans.gameObject);
			return;
		}
		else if (trans.parent != null) {
			Cleanup(trans.parent);
		}
	}
}
