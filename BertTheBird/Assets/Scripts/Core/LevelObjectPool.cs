using UnityEngine;
using System.Linq;
using System.Collections;
using System.Collections.Generic;

[System.Serializable]
public class propObj {
	public GameObject obj;
	public int PreloadAmount = 4;
}

public static class LevelPool {
	public static Vector3 Void = new Vector3(0,-100,30);
	public static List<GameObject> CashedObjects;
	public static List<GameObject> ActiveObjects;



	//Instanciate Function
	public static void Instanciate(Vector3 Position) {
		if (CashedObjects != null && CashedObjects.Count > 0) {
			Vector3 spawnPos = Position;

			GameObject Go = CashedObjects[Random.Range(0, CashedObjects.Count)];
			PropSettings Settings = Go.GetComponent<PropSettings>();
			if (Settings != null) {
				spawnPos.y = Random.Range(Settings.maxY, Settings.minY);
			}
			Go.transform.position = spawnPos;
			ActiveObjects.Add(Go);
			CashedObjects.Remove(Go);
			Go.SetActive(true);
			foreach (Transform child in Go.transform)
			{
				child.gameObject.SetActive(true);
			} 
		}
	}

	//Destroy Function
	public static void destroy(GameObject Go) {
		if (ActiveObjects.Contains (Go)) {
			Go.transform.position = LevelPool.Void;
			LevelPool.CashedObjects.Add(Go);
			LevelPool.ActiveObjects.Remove(Go);
			Go.SetActive (false);
		}
	}

	//Reset Function
	public static void SoftReset() {

		foreach (GameObject Go in ActiveObjects.ToList()) {
			destroy(Go);
		}
	}

	public static void Clear() {
		LevelPool.ActiveObjects.Clear ();
		LevelPool.CashedObjects.Clear ();
		Transform ObjectPool = GameObject.FindGameObjectWithTag ("ObjectPool").transform;
		foreach (Transform child in ObjectPool)
		{
			Object.Destroy(child.gameObject);
		} 
	}
}


public class LevelObjectPool : MonoBehaviour {
	public propObj[] Props;

	//Use this for initialization
	void Start () {
		LevelPool.ActiveObjects = new List<GameObject>();
		LevelPool.CashedObjects = new List<GameObject>();
		PreloadGameObjects();
	}

	//Instanciate All GameObjects
	public void PreloadGameObjects() {
		LevelPool.Clear();

		for (int i = 0; i < Props.Length; i++) {
			// Loops Through All Selected Probs
			for (int g = 0; g < Props[i].PreloadAmount ; g++) {
				// Instanciates Selected Amount
				GameObject Go = (GameObject)Instantiate(Props[i].obj, transform.position, transform.rotation);
				Go.name += "_" + g;
				Go.transform.parent = transform;
				//Go.GetComponent<SpriteRenderer>().enabled = false;
				Go.SetActive(false);
				LevelPool.CashedObjects.Add(Go);
			}
		}
	}
}
